"""AI matching engine.

Phase 1 – weighted multi-signal score (skill, distance, availability, experience, rating, price, reliability)
Phase 2 – semantic skill similarity (TF-IDF 'embeddings' over multilingual skill vocab + related-skill graph).
          Drop-in replaceable with sentence-transformers / pgvector embeddings.
Phase 3 – learned acceptance model: logistic regression trained on historical match outcomes
          -> P(worker accepts job). Blended into the final ranking.
"""
import math
import re
from collections import Counter
from datetime import date as Date

from sqlalchemy.orm import Session

from . import models as m
from .geo import haversine_km
from .skills import SKILLS, SKILL_MAP
from .pricing import DURATION_HOURS

WEIGHTS = {"skill": 0.35, "distance": 0.20, "availability": 0.15, "experience": 0.10, "rating": 0.10, "price": 0.05, "reliability": 0.05}
LEVEL = {"expert": 1.0, "advanced": 0.9, "intermediate": 0.75, "beginner": 0.6}
MAX_KM = 25

# ------------------------------------------------------------------ semantic vectors (TF-IDF)
_TOKEN = re.compile(r"[a-z]+|[ಀ-೿]+|[ऀ-ॿ]+")


def _tokens(text: str) -> list[str]:
    return _TOKEN.findall(text.lower())


_SKILL_DOCS = {s["id"]: _tokens(" ".join(s["kw"] + [s["en"], s["kn"], s["hi"], s["cat"]])) for s in SKILLS}
_DF = Counter(tok for doc in _SKILL_DOCS.values() for tok in set(doc))
_N = len(_SKILL_DOCS)


def _vec(tokens: list[str]) -> dict:
    tf = Counter(tokens)
    return {t: c * (math.log((_N + 1) / (_DF.get(t, 0) + 1)) + 1) for t, c in tf.items()}


def _cos(a: dict, b: dict) -> float:
    if not a or not b:
        return 0.0
    dot = sum(v * b.get(k, 0) for k, v in a.items())
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def semantic_similarity(job_text: str, job_skills: list[str], worker_skill_ids: list[str]) -> float:
    jt = _tokens(job_text)
    for s in job_skills:
        jt += _SKILL_DOCS.get(s, [])
    wt = []
    for s in worker_skill_ids:
        wt += _SKILL_DOCS.get(s, [])
    return _cos(_vec(jt), _vec(wt))


def skill_match(job: m.Job, wp: m.WorkerProfile) -> tuple[float, list[str]]:
    wskills = {s["skill"]: s for s in (wp.skills or [])}
    reasons = []
    if not job.skills:
        cat_hit = any(SKILL_MAP.get(s, {}).get("cat") == job.category for s in wskills)
        return (0.6 if cat_hit else 0.1), (["Works in this category"] if cat_hit else [])
    total = 0.0
    for sid in job.skills:
        if sid in wskills:
            ws = wskills[sid]
            v = LEVEL.get(ws.get("level", "intermediate"), 0.75) + (0.05 if ws.get("verified") else 0)
            total += min(1.0, v)
            label = f"{ws.get('level', '').capitalize()} in {SKILL_MAP[sid]['en'].lower()}" if sid in SKILL_MAP else sid
            reasons.append(label + (" ✓ verified" if ws.get("verified") else ""))
        else:
            related = set(SKILL_MAP.get(sid, {}).get("related", []))
            if related & set(wskills):
                total += 0.45
                reasons.append(f"Related skill for {SKILL_MAP[sid]['en'].lower()}")
    coverage = total / len(job.skills)
    sem = semantic_similarity(f"{job.title} {job.description}", job.skills, list(wskills))
    return round(min(1.0, 0.78 * coverage + 0.22 * sem), 3), reasons


def expected_rate(wp: m.WorkerProfile, job: m.Job) -> int:
    hours = DURATION_HOURS.get(job.duration, 4)
    if hours >= 6:
        return wp.daily_rate * (2 if job.duration == "multi_day" else 1)
    return min(wp.daily_rate, wp.hourly_rate * max(hours, 2))


def reliability(wp: m.WorkerProfile) -> dict:
    if wp.jobs_accepted == 0:
        return {"score": 0.7, "completion_rate": None, "on_time_rate": None, "cancellation_rate": None}
    comp = wp.jobs_completed / max(wp.jobs_accepted, 1)
    ontime = wp.on_time_count / max(wp.jobs_completed, 1)
    canc = wp.cancellations / max(wp.jobs_accepted, 1)
    score = 0.5 * min(comp, 1) + 0.3 * min(ontime, 1) + 0.2 * (1 - min(canc, 1))
    return {"score": round(score, 3), "completion_rate": round(min(comp, 1) * 100), "on_time_rate": round(min(ontime, 1) * 100),
            "cancellation_rate": round(min(canc, 1) * 100)}


def _busy_on(db: Session, worker_id: int, day: str) -> bool:
    q = (db.query(m.Booking).join(m.Job, m.Job.id == m.Booking.job_id)
         .filter(m.Booking.worker_id == worker_id, m.Job.date == day,
                 m.Booking.status.in_(["confirmed", "on_the_way", "arrived"])))
    return db.query(q.exists()).scalar()


def availability_score(db: Session, wp: m.WorkerProfile, job: m.Job) -> tuple[float, str]:
    today = Date.today().isoformat()
    if _busy_on(db, wp.user_id, job.date):
        return 0.25, "Already has work that day"
    if job.date == today or job.urgent:
        if wp.available:
            return 1.0, "🟢 Available now"
        return (0.0, "Not available now") if job.urgent else (0.3, "Not marked available today")
    try:
        wd = Date.fromisoformat(job.date).strftime("%a")
    except ValueError:
        wd = ""
    if wd in (wp.available_days or []):
        return 0.85, f"Usually works on {wd}"
    return 0.4, f"Doesn't usually work on {wd}"


def score_pair(db: Session, job: m.Job, wp: m.WorkerProfile) -> dict | None:
    u = wp.user
    dist = haversine_km(job.lat, job.lng, u.lat, u.lng)
    if dist > MAX_KM:
        return None
    sk, sk_reasons = skill_match(job, wp)
    if sk < 0.15:
        return None
    reach = max(wp.radius_km, 3)
    dscore = 1.0 if dist <= 1 else max(0.0, 1 - (dist - 1) / (reach * 1.4))
    if dist > wp.radius_km:
        dscore *= 0.5
    av, av_reason = availability_score(db, wp, job)
    exp = min(1.0, (wp.experience_years / 8) * 0.5 + (wp.jobs_completed / 100) * 0.5)
    rat = (wp.rating / 5) if wp.rating_count else 0.6
    exp_rate = expected_rate(wp, job)
    budget = job.budget or exp_rate
    pr = 1.0 if budget >= exp_rate else (budget / exp_rate) ** 2
    rel = reliability(wp)
    parts = {"skill": sk, "distance": dscore, "availability": av, "experience": exp, "rating": rat, "price": pr, "reliability": rel["score"]}
    rule = sum(parts[k] * w for k, w in WEIGHTS.items()) * 100
    feats = [sk, dscore, av, rat, pr, rel["score"], min(dist / 10, 2)]
    p_accept = MODEL.predict(feats)
    final = 0.85 * rule + 0.15 * p_accept * 100
    if job.preferred_worker_id == wp.user_id:
        final += 5
    reasons = sk_reasons[:2] + [f"📍 {dist:.1f} km away", av_reason]
    if wp.rating_count:
        reasons.append(f"⭐ {wp.rating:.1f} from {wp.rating_count} reviews")
    reasons.append("💰 Rate fits budget" if pr >= 1 else f"💰 Usually charges ₹{exp_rate}")
    return {
        "worker_id": wp.user_id, "score": round(min(final, 100), 1), "rule_score": round(rule, 1),
        "accept_prob": round(p_accept, 2), "distance_km": round(dist, 2), "expected_rate": exp_rate,
        "breakdown": {k: round(v * 100) for k, v in parts.items()}, "reasons": reasons,
    }


def rank_workers(db: Session, job: m.Job, limit=20) -> list[dict]:
    wps = db.query(m.WorkerProfile).join(m.User).filter(m.User.blocked == False, m.User.id != job.customer_id).all()  # noqa: E712
    out = [r for r in (score_pair(db, job, wp) for wp in wps) if r]
    out.sort(key=lambda r: -r["score"])
    return out[:limit]


def run_matching(db: Session, job: m.Job, notify=True) -> list[dict]:
    ranked = rank_workers(db, job, limit=20)
    db.query(m.Match).filter(m.Match.job_id == job.id, m.Match.status.in_(["suggested", "notified"])).delete()
    keep = {x.worker_id for x in db.query(m.Match).filter(m.Match.job_id == job.id).all()}
    n_notify = max(5, job.workers_required * 3)
    # Pro workers get priority alerts
    pro_ids = {u.id for u in db.query(m.User).filter(m.User.subscription == "pro").all()}
    notify_order = sorted(ranked, key=lambda r: -(r["score"] + (8 if r["worker_id"] in pro_ids else 0)))
    notify_set = {r["worker_id"] for r in notify_order[:n_notify]}
    for r in ranked:
        if r["worker_id"] in keep:
            continue
        status = "notified" if (notify and r["worker_id"] in notify_set) else "suggested"
        db.add(m.Match(job_id=job.id, worker_id=r["worker_id"], score=r["score"], accept_prob=r["accept_prob"],
                       breakdown={"parts": r["breakdown"], "reasons": r["reasons"], "distance_km": r["distance_km"], "expected_rate": r["expected_rate"]},
                       status=status))
        if status == "notified":
            icon = "🚨" if job.urgent else "🔔"
            db.add(m.Notification(user_id=r["worker_id"], kind="job_alert", link=f"/worker/jobs/{job.id}",
                                  title=f"{icon} {'Urgent' if job.urgent else 'New'} work near you: {job.title}",
                                  body=f"📍 {r['distance_km']} km • 💰 ₹{job.budget} • 📅 {job.date} • Match {int(r['score'])}%"))
    db.commit()
    return ranked


def jobs_for_worker(db: Session, wp: m.WorkerProfile, limit=30) -> list[dict]:
    jobs = db.query(m.Job).filter(m.Job.status == "open", m.Job.customer_id != wp.user_id).all()
    out = []
    for j in jobs:
        r = score_pair(db, j, wp)
        if r:
            out.append((j, r))
    out.sort(key=lambda x: (-x[1]["score"]))
    return out[:limit]


# ------------------------------------------------------------------ Phase 3: learned acceptance model
class LogisticModel:
    names = ["skill", "distance", "availability", "rating", "price", "reliability", "km10"]

    def __init__(self):
        self.w = [1.2, 1.5, 1.8, 0.4, 1.0, 0.5, -0.6]
        self.b = -2.4
        self.trained_on = 0
        self.accuracy = None

    def predict(self, x) -> float:
        z = self.b + sum(wi * xi for wi, xi in zip(self.w, x))
        return 1 / (1 + math.exp(-max(-30, min(30, z))))

    def fit(self, X, y, epochs=400, lr=0.3, l2=0.001):
        if len(X) < 20:
            return
        n = len(X)
        for _ in range(epochs):
            gw = [0.0] * len(self.w)
            gb = 0.0
            for xi, yi in zip(X, y):
                err = self.predict(xi) - yi
                for k in range(len(gw)):
                    gw[k] += err * xi[k]
                gb += err
            self.w = [w - lr * (g / n + l2 * w) for w, g in zip(self.w, gw)]
            self.b -= lr * gb / n
        correct = sum(1 for xi, yi in zip(X, y) if (self.predict(xi) >= 0.5) == bool(yi))
        self.trained_on = n
        self.accuracy = round(correct / n, 3)

    def info(self):
        return {"weights": dict(zip(self.names, [round(w, 3) for w in self.w])), "bias": round(self.b, 3),
                "trained_on": self.trained_on, "accuracy": self.accuracy}


MODEL = LogisticModel()


def train_model(db: Session):
    rows = db.query(m.Match).filter(m.Match.status.in_(["accepted", "declined"])).all()
    X, y = [], []
    for r in rows:
        p = (r.breakdown or {}).get("parts")
        if not p:
            continue
        X.append([p["skill"] / 100, p["distance"] / 100, p["availability"] / 100, p["rating"] / 100, p["price"] / 100,
                  p["reliability"] / 100, min((r.breakdown.get("distance_km", 5)) / 10, 2)])
        y.append(1 if r.status == "accepted" else 0)
    MODEL.fit(X, y)
    return MODEL.info()
