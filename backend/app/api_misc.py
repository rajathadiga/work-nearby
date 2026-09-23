import os
import secrets
from collections import Counter, defaultdict
from datetime import datetime, date as Date, timedelta

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .db import get_db, UPLOAD_DIR
from . import models as m
from .core import get_user, get_admin, notify, worker_public, job_public, booking_public, user_public, new_token
from .geo import haversine_km, nearest_place, find_place, PLACES
from .skills import SKILL_MAP, SKILLS
from .matching import MODEL, train_model, jobs_for_worker
from .parser import understand
from .pricing import suggest_price

router = APIRouter(prefix="/api")


# ------------------------------------------------------------------ uploads
@router.post("/upload")
async def upload(file: UploadFile = File(...), u: m.User = Depends(get_user)):
    ext = os.path.splitext(file.filename or "")[1].lower()[:6] or ".bin"
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov", ".pdf", ".heic"):
        raise HTTPException(400, "Unsupported file type")
    data = await file.read()
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 25MB)")
    name = f"{u.id}_{secrets.token_hex(6)}{ext}"
    with open(os.path.join(UPLOAD_DIR, name), "wb") as f:
        f.write(data)
    return {"url": f"/uploads/{name}"}


# ------------------------------------------------------------------ notifications
@router.get("/notifications")
def notifications(u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    rows = db.query(m.Notification).filter(m.Notification.user_id == u.id).order_by(m.Notification.id.desc()).limit(40).all()
    return {"unread": db.query(m.Notification).filter(m.Notification.user_id == u.id, m.Notification.read == False).count(),  # noqa: E712
            "items": [{"id": n.id, "title": n.title, "body": n.body, "kind": n.kind, "link": n.link, "read": n.read,
                       "created_at": n.created_at.isoformat() + "Z"} for n in rows]}


@router.post("/notifications/read")
def read_all(u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    db.query(m.Notification).filter(m.Notification.user_id == u.id).update({"read": True})
    db.commit()
    return {"ok": True}


# ------------------------------------------------------------------ browse workers & favorites
@router.get("/workers")
def browse_workers(skill: str = "", available: bool = False, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    out = []
    for wp in db.query(m.WorkerProfile).join(m.User).filter(m.User.blocked == False).all():  # noqa: E712
        if wp.user_id == u.id or not wp.skills:
            continue
        if skill and not any(s["skill"] == skill or SKILL_MAP.get(s["skill"], {}).get("cat") == skill for s in wp.skills):
            continue
        if available and not wp.available:
            continue
        d = worker_public(wp, u.lat, u.lng)
        if d["distance_km"] <= 30:
            out.append(d)
    out.sort(key=lambda d: (not d["available"], d["distance_km"] - d["rating"]))
    return out[:60]


@router.get("/favorites")
def favorites(u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    out = []
    for f in db.query(m.Favorite).filter(m.Favorite.customer_id == u.id).all():
        w = db.get(m.User, f.worker_id)
        if w and w.worker:
            d = worker_public(w.worker, u.lat, u.lng)
            last = db.query(m.Booking).filter(m.Booking.customer_id == u.id, m.Booking.worker_id == w.id).order_by(m.Booking.id.desc()).first()
            if last:
                lj = db.get(m.Job, last.job_id)
                d["last_job"] = {"id": lj.id, "title": lj.title, "date": lj.date, "skills": lj.skills, "budget": lj.budget,
                                 "duration": lj.duration, "category": lj.category, "description": lj.description}
            out.append(d)
    return out


@router.post("/favorites/{worker_id}")
def add_fav(worker_id: int, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    if not db.query(m.Favorite).filter(m.Favorite.customer_id == u.id, m.Favorite.worker_id == worker_id).first():
        db.add(m.Favorite(customer_id=u.id, worker_id=worker_id))
        db.commit()
    return {"ok": True}


@router.delete("/favorites/{worker_id}")
def del_fav(worker_id: int, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    db.query(m.Favorite).filter(m.Favorite.customer_id == u.id, m.Favorite.worker_id == worker_id).delete()
    db.commit()
    return {"ok": True}


@router.get("/customer/bookings")
def customer_bookings(u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    bs = db.query(m.Booking).filter(m.Booking.customer_id == u.id).order_by(m.Booking.id.desc()).limit(50).all()
    return [booking_public(db, b) for b in bs]


# ------------------------------------------------------------------ worker groups
def _group_public(db, g: m.WorkerGroup, u: m.User):
    members = [db.get(m.User, wid) for wid in g.members]
    return {"id": g.id, "name": g.name, "area": g.area, "skill": g.skill, "skill_name": SKILL_MAP.get(g.skill, {}).get("en", g.skill),
            "icon": SKILL_MAP.get(g.skill, {}).get("icon", ""), "lat": g.lat, "lng": g.lng, "size": len(g.members),
            "available_now": sum(1 for x in members if x and x.worker and x.worker.available),
            "is_member": u.id in g.members, "distance_km": round(haversine_km(u.lat, u.lng, g.lat, g.lng), 1),
            "members": [{"id": x.id, "name": x.name, "rating": round(x.worker.rating, 1) if x.worker else 0,
                         "available": bool(x.worker and x.worker.available)} for x in members if x][:30]}


@router.get("/groups")
def groups(u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    gs = [_group_public(db, g, u) for g in db.query(m.WorkerGroup).all()]
    gs.sort(key=lambda g: (not g["is_member"], g["distance_km"]))
    return gs


class GroupIn(BaseModel):
    name: str
    skill: str


@router.post("/groups")
def create_group(body: GroupIn, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    g = m.WorkerGroup(name=body.name, skill=body.skill, area=u.area, lat=u.lat, lng=u.lng, leader_id=u.id, members=[u.id])
    db.add(g)
    db.commit()
    return _group_public(db, g, u)


@router.post("/groups/{gid}/join")
def join_group(gid: int, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    g = db.get(m.WorkerGroup, gid)
    if not g:
        raise HTTPException(404, "Group not found")
    if u.id in g.members:
        g.members = [x for x in g.members if x != u.id]
    else:
        g.members = [*g.members, u.id]
    db.commit()
    return _group_public(db, g, u)


# ------------------------------------------------------------------ safety
class SosIn(BaseModel):
    booking_id: int = 0
    lat: float | None = None
    lng: float | None = None


@router.post("/sos")
def sos(body: SosIn, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    a = m.SOSAlert(user_id=u.id, booking_id=body.booking_id, lat=body.lat or u.lat, lng=body.lng or u.lng)
    db.add(a)
    for admin in db.query(m.User).filter(m.User.role == "admin").all():
        notify(db, admin.id, f"🆘 SOS from {u.name}", f"Phone {u.phone} • booking #{body.booking_id}", "/admin", "sos")
    db.commit()
    return {"ok": True, "alert_id": a.id, "trusted_contact": {"name": u.trusted_contact_name, "phone": u.trusted_contact_phone},
            "emergency_number": "112"}


class DocIn(BaseModel):
    url: str = ""


@router.post("/verify/{kind}")
def submit_verification(kind: str, body: DocIn, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    if kind == "id":
        u.id_status, u.id_doc = "pending", body.url
    elif kind == "face":
        u.face_status, u.face_doc = "pending", body.url
    elif kind == "address":
        u.address_status = "pending"
    else:
        raise HTTPException(400, "Unknown verification")
    for admin in db.query(m.User).filter(m.User.role == "admin").all():
        notify(db, admin.id, f"{kind.upper()} verification request", u.name, "/admin", "admin")
    db.commit()
    return user_public(u)


class PlanIn(BaseModel):
    plan: str


@router.post("/subscribe")
def subscribe(body: PlanIn, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    if body.plan not in ("free", "pro", "homecare"):
        raise HTTPException(400, "Unknown plan")
    u.subscription = body.plan
    notify(db, u.id, "Plan updated", f"You are now on {body.plan.upper()}", "", "info")
    db.commit()
    return user_public(u)


class BizIn(BaseModel):
    business_name: str
    business_type: str
    contact_phone: str
    need: str
    workers: int = 1
    frequency: str = "weekly"


@router.post("/business-requests")
def business_request(body: BizIn, db: Session = Depends(get_db)):
    r = m.BusinessRequest(**body.model_dump())
    db.add(r)
    for admin in db.query(m.User).filter(m.User.role == "admin").all():
        notify(db, admin.id, f"Business enquiry: {body.business_name}", body.need[:80], "/admin", "admin")
    db.commit()
    return {"ok": True, "id": r.id}


# ------------------------------------------------------------------ local work intelligence
@router.get("/insights/heatmap")
def heatmap(skill: str = "", db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=30)
    jobs = db.query(m.Job).filter(m.Job.created_at >= since).all()
    pts = []
    for j in jobs:
        if skill and skill not in j.skills and skill != j.category:
            continue
        pts.append({"lat": j.lat, "lng": j.lng, "w": 2 if j.status == "open" else 1, "open": j.status == "open", "title": j.title, "id": j.id})
    workers = [{"lat": wp.user.lat, "lng": wp.user.lng, "available": wp.available}
               for wp in db.query(m.WorkerProfile).all() if not skill or any(s["skill"] == skill or SKILL_MAP.get(s["skill"], {}).get("cat") == skill for s in wp.skills)]
    areas = []
    for p in PLACES:
        dj = sum(1 for x in pts if x["open"] and haversine_km(p["lat"], p["lng"], x["lat"], x["lng"]) < 3)
        aw = sum(1 for w in workers if w["available"] and haversine_km(p["lat"], p["lng"], w["lat"], w["lng"]) < 3)
        if dj or aw:
            areas.append({**p, "open_jobs": dj, "available_workers": aw, "heat": round((dj + 1) / (aw + 1), 2)})
    areas.sort(key=lambda a: -a["heat"])
    return {"jobs": pts, "workers": workers, "areas": areas}


def demand_trends(db: Session, lat: float, lng: float, radius=12):
    now = datetime.utcnow()
    recent, prev = Counter(), Counter()
    for j in db.query(m.Job).filter(m.Job.created_at >= now - timedelta(days=28)).all():
        if haversine_km(lat, lng, j.lat, j.lng) > radius:
            continue
        bucket = recent if j.created_at >= now - timedelta(days=14) else prev
        for s in j.skills[:2]:
            bucket[s] += 1
    supply = Counter()
    for wp in db.query(m.WorkerProfile).all():
        if haversine_km(lat, lng, wp.user.lat, wp.user.lng) <= radius:
            for s in wp.skills:
                supply[s["skill"]] += 1
    out = []
    for s, c in recent.items():
        p = prev.get(s, 0)
        change = round(((c - p) / p) * 100) if p else 100
        out.append({"skill": s, "name": SKILL_MAP[s]["en"], "icon": SKILL_MAP[s]["icon"], "jobs": c, "change_pct": change,
                    "workers": supply.get(s, 0), "gap": round(c / (supply.get(s, 0) + 1), 2), "avg_rate": SKILL_MAP[s]["rate"], "unit": SKILL_MAP[s]["unit"]})
    out.sort(key=lambda x: (-x["gap"], -x["jobs"]))
    return out


@router.get("/insights/demand")
def demand(lat: float = 13.3409, lng: float = 74.7421, db: Session = Depends(get_db)):
    by_area = {}
    for p in PLACES[:8]:
        tr = demand_trends(db, p["lat"], p["lng"], radius=4)
        by_area[p["name"]] = tr[:3]
    return {"near_you": demand_trends(db, lat, lng), "by_area": by_area}


@router.get("/worker/insights")
def worker_insights(u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    wp = u.worker
    trends = demand_trends(db, u.lat, u.lng)
    have = {s["skill"] for s in (wp.skills if wp else [])}
    related = Counter()
    for s in have:
        for r in SKILL_MAP.get(s, {}).get("related", []):
            if r not in have:
                related[r] += 1
    tmap = {t["skill"]: t for t in trends}
    sugg = []
    for sid, cnt in related.items():
        t = tmap.get(sid)
        score = cnt + (t["gap"] * 2 if t else 0)
        sugg.append({"skill": sid, "name": SKILL_MAP[sid]["en"], "icon": SKILL_MAP[sid]["icon"], "score": round(score, 2),
                     "jobs_nearby": t["jobs"] if t else 0, "avg_rate": SKILL_MAP[sid]["rate"], "unit": SKILL_MAP[sid]["unit"],
                     "why": f"Close to your {', '.join(SKILL_MAP[h]['en'].lower() for h in have if sid in SKILL_MAP[h]['related'])} skill"
                            + (f" • {t['jobs']} jobs nearby recently" if t else "")})
    sugg.sort(key=lambda x: -x["score"])
    growth = {"jobs_completed": wp.jobs_completed if wp else 0, "verified_id": u.id_status == "verified",
              "verified_skills": sum(1 for s in (wp.skills if wp else []) if s.get("verified")), "rating": wp.rating if wp else 0}
    steps = [
        {"key": "profile", "label": "Digital profile", "done": bool(wp and wp.skills)},
        {"key": "id", "label": "ID verified", "done": u.id_status == "verified"},
        {"key": "skills", "label": "Verified skills", "done": growth["verified_skills"] > 0},
        {"key": "history", "label": "10+ jobs done", "done": growth["jobs_completed"] >= 10},
        {"key": "ratings", "label": "4.5+ rating", "done": growth["rating"] >= 4.5},
        {"key": "trusted", "label": "Trusted worker", "done": growth["jobs_completed"] >= 20 and u.id_status == "verified" and growth["rating"] >= 4.3},
    ]
    return {"trends": trends[:10], "suggestions": sugg[:6], "growth": steps}


# ------------------------------------------------------------------ WhatsApp bot simulator
class BotIn(BaseModel):
    phone: str
    text: str


NEED_WORK = ["need work", "want work", "looking for work", "work beku", "kelsa beku", "kelasa beku", "ಕೆಲಸ ಬೇಕು", "kaam chahiye", "काम चाहिए", "job beku", "available"]
YES = ["yes", "y", "ok", "haan", "ha", "houdu", "hoon", "ಹೌದು", "हाँ", "confirm", "1"]


def _bot_user(db, phone, role):
    u = db.query(m.User).filter(m.User.phone == phone).first()
    if not u:
        u = m.User(phone=phone, name=f"WhatsApp {phone[-4:]}", role=role)
        db.add(u)
        db.flush()
        if role == "worker":
            db.add(m.WorkerProfile(user=u, user_id=u.id, skills=[]))
            db.flush()
    return u


@router.post("/bot/message")
def bot(body: BotIn, db: Session = Depends(get_db)):
    phone = "".join(c for c in body.phone if c.isdigit())[-10:] or "9000000000"
    text = body.text.strip()
    tl = text.lower()
    sess = db.get(m.BotSession, phone) or m.BotSession(phone=phone, state={})
    if sess not in db:
        db.add(sess)
    st = dict(sess.state or {})
    replies = []

    def done(state):
        sess.state = state
        db.commit()
        return {"replies": replies}

    if tl in ("hi", "hello", "menu", "namaskara", "namaste", "start", "ನಮಸ್ಕಾರ", "नमस्ते"):
        replies.append("🙏 Namaskara! Welcome to *KaamNear*.\n\n1️⃣ I need a worker\n2️⃣ I need work\n\nOr just type what you need, e.g. _Need gardener tomorrow 9am near Manipal_")
        return done({})

    # --- worker picking a job from the list
    if st.get("mode") == "work_list" and tl.isdigit():
        ids = st.get("jobs", [])
        idx = int(tl) - 1
        if 0 <= idx < len(ids):
            j = db.get(m.Job, ids[idx])
            u = _bot_user(db, phone, "worker")
            from .core import create_booking
            try:
                create_booking(db, j, u, by="worker")
                replies.append(f"✅ You got the job: *{j.title}*\n📍 {j.address}\n📅 {j.date} ({j.time_slot})\n💰 ₹{j.budget}\n\nCustomer will be informed. Reply *menu* anytime.")
            except HTTPException as e:
                replies.append(f"❌ {e.detail}")
            return done({})
        replies.append("Please reply with a job number from the list.")
        return done(st)

    # --- customer confirming budget / job
    if st.get("mode") == "ask_budget":
        digits = "".join(c for c in tl if c.isdigit())
        draft = st["draft"]
        if digits:
            draft["budget"] = int(digits)
        elif tl in ("ok", "yes", "suggested", "sari", "ಸರಿ", "ठीक"):
            draft["budget"] = draft["price"]["suggested"]
        else:
            replies.append("Please send the amount in ₹ (e.g. 700) or reply *ok* to use the suggested price.")
            return done(st)
        replies.append(f"📝 Please confirm:\n\n*{draft['title']}*\n📍 {draft['place']}\n📅 {draft['date']} ({draft['time_slot']})\n👷 {draft['workers_required']} worker(s)\n💰 ₹{draft['budget']}\n\nReply *yes* to post.")
        return done({"mode": "confirm", "draft": draft})

    if st.get("mode") == "confirm":
        if tl in YES:
            d = st["draft"]
            u = _bot_user(db, phone, "customer")
            from .api_jobs import create_job_record, JobIn
            p = next(p for p in PLACES if p["name"] == d["place"])
            try:
                j, risk, ranked = create_job_record(db, u, JobIn(title=d["title"], description=d["text"], category=d["category"], skills=d["skills"],
                                                                 lat=p["lat"], lng=p["lng"], address=p["name"], date=d["date"], time_slot=d["time_slot"],
                                                                 urgent=d["urgent"], budget=d["budget"], duration=d["duration"], quantity=d["quantity"],
                                                                 workers_required=d["workers_required"], source="whatsapp"))
                replies.append(f"🎉 Job posted! We alerted *{min(len(ranked), max(5, j.workers_required * 3))} nearby workers*.\nYou'll get a message here when someone accepts.\n\nJob ID: #{j.id}")
            except HTTPException as e:
                replies.append(f"❌ {e.detail}")
            return done({})
        replies.append("Okay, cancelled. Type what you need anytime 🙂")
        return done({})

    # --- worker wants work
    if tl in ("2",) or any(w in tl for w in NEED_WORK):
        u = _bot_user(db, phone, "worker")
        place = find_place(text)
        if place:
            u.lat, u.lng, u.area = place["lat"], place["lng"], place["name"]
        wp = u.worker
        wp.available = True
        if not wp.skills:
            from .parser import detect_skills
            found = [s for s, _ in detect_skills(text)[:3]]
            if found:
                wp.skills = [{"skill": s, "level": "intermediate", "verified": False, "status": "none"} for s in found]
        db.flush()
        if wp.skills:
            items = jobs_for_worker(db, wp, limit=5)
        else:
            items = []
            for j in db.query(m.Job).filter(m.Job.status == "open").all():
                if haversine_km(u.lat, u.lng, j.lat, j.lng) <= 8:
                    items.append((j, {"distance_km": round(haversine_km(u.lat, u.lng, j.lat, j.lng), 1)}))
            items.sort(key=lambda x: x[1]["distance_km"])
            items = items[:5]
        if not items:
            replies.append("😔 No work near you right now. We'll message you when new work comes. You are marked 🟢 available.")
            return done({})
        lines = [f"🟢 You are available. *{len(items)} jobs near {u.area}:*\n"]
        nums = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"]
        for i, (j, r) in enumerate(items):
            lines.append(f"{nums[i]} {j.title} – ₹{j.budget}\n    📍 {r['distance_km']} km • 📅 {j.date}")
        lines.append("\nReply with the number to take the job.")
        replies.append("\n".join(lines))
        return done({"mode": "work_list", "jobs": [j.id for j, _ in items]})

    if tl == "1":
        replies.append("👍 Tell me what work you need, where and when.\nExample: _Need 2 people to clean garden tomorrow morning in Malpe_\n(You can type in Kannada, Hindi or English)")
        return done({"mode": "need"})

    # --- anything else: try to understand as a job request
    p = understand(text)
    if not p["skills"]:
        replies.append("🤔 Sorry, I didn't understand. Try: _Need plumber today in Udupi_ or _Nanage ivattu kelsa beku_\nReply *menu* for options.")
        return done(st)
    place = find_place(text) or {"name": "Udupi", "lat": 13.3409, "lng": 74.7421}
    date_ = p["date"] or (Date.today() + timedelta(days=1)).isoformat()
    price = suggest_price(db, p["skills"], p["duration"], p["quantity"], p["workers_required"], place["lat"], place["lng"], date_, p["urgent"])
    draft = {**p, "text": text, "place": place["name"], "date": date_, "price": price}
    replies.append(f"✅ Got it!\n\n🔧 *{p['title']}*\n📍 {place['name']}\n📅 {date_} ({p['time_slot']})\n👷 {p['workers_required']} worker(s)")
    replies.append(f"💰 Usual price here: *₹{price['low']} – ₹{price['high']}*\nWhat is your budget? (send amount, or *ok* for ₹{price['suggested']})")
    return done({"mode": "ask_budget", "draft": draft})


# ------------------------------------------------------------------ admin
@router.get("/admin/overview")
def admin_overview(a: m.User = Depends(get_admin), db: Session = Depends(get_db)):
    today = Date.today().isoformat()
    users = db.query(m.User).count()
    workers = db.query(m.WorkerProfile).count()
    jobs_today = db.query(m.Job).filter(m.Job.date == today).all()
    pays = db.query(m.Payment).filter(m.Payment.status == "paid").all()
    month = datetime.utcnow() - timedelta(days=30)
    series = defaultdict(lambda: {"jobs": 0, "gmv": 0})
    for j in db.query(m.Job).filter(m.Job.created_at >= month).all():
        series[j.created_at.date().isoformat()]["jobs"] += 1
    for p in pays:
        if p.created_at >= month:
            series[p.created_at.date().isoformat()]["gmv"] += p.amount
    days = [(Date.today() - timedelta(days=i)).isoformat() for i in range(29, -1, -1)]
    cats = Counter(j.category for j in db.query(m.Job).all())
    return {
        "users": users, "workers": workers, "customers": db.query(m.User).filter(m.User.role == "customer").count(),
        "available_now": db.query(m.WorkerProfile).filter(m.WorkerProfile.available == True).count(),  # noqa: E712
        "jobs_today": len(jobs_today), "completed_today": sum(1 for j in jobs_today if j.status == "completed"),
        "cancelled_today": sum(1 for j in jobs_today if j.status == "cancelled"),
        "open_jobs": db.query(m.Job).filter(m.Job.status == "open").count(),
        "gmv": sum(p.amount for p in pays), "revenue": sum(p.platform_fee for p in pays),
        "held_escrow": sum(p.amount for p in db.query(m.Payment).filter(m.Payment.status == "held").all()),
        "series": [{"date": d[5:], **series[d]} for d in days],
        "categories": [{"category": k, "jobs": v} for k, v in cats.most_common()],
        "subscriptions": dict(Counter(u.subscription for u in db.query(m.User).all())),
        "model": MODEL.info(),
    }


@router.get("/admin/map")
def admin_map(a: m.User = Depends(get_admin), db: Session = Depends(get_db)):
    workers = [{"id": wp.user_id, "name": wp.user.name, "lat": wp.user.lat, "lng": wp.user.lng, "available": wp.available} for wp in db.query(m.WorkerProfile).all()]
    jobs = [{"id": j.id, "title": j.title, "lat": j.lat, "lng": j.lng, "status": j.status, "urgent": j.urgent}
            for j in db.query(m.Job).filter(m.Job.status.in_(["open", "assigned", "in_progress"])).all()]
    return {"workers": workers, "jobs": jobs}


@router.get("/admin/queues")
def admin_queues(a: m.User = Depends(get_admin), db: Session = Depends(get_db)):
    ver = []
    for u in db.query(m.User).filter((m.User.id_status == "pending") | (m.User.face_status == "pending") | (m.User.address_status == "pending")).all():
        ver.append({"user": user_public(u), "id_doc": u.id_doc, "face_doc": u.face_doc})
    skill_ver = []
    for wp in db.query(m.WorkerProfile).all():
        for s in wp.skills:
            if s.get("status") == "pending":
                skill_ver.append({"worker_id": wp.user_id, "name": wp.user.name, "skill": s["skill"], "skill_name": SKILL_MAP.get(s["skill"], {}).get("en"), "evidence": s.get("evidence")})
    disputes = []
    for d in db.query(m.Dispute).order_by(m.Dispute.id.desc()).all():
        b = db.get(m.Booking, d.booking_id)
        msgs = db.query(m.Message).filter(m.Message.job_id == b.job_id,
                                          m.Message.sender_id.in_([b.worker_id, b.customer_id]), m.Message.receiver_id.in_([b.worker_id, b.customer_id])).all()
        disputes.append({"id": d.id, "reason": d.reason, "status": d.status, "resolution": d.resolution, "raised_by": db.get(m.User, d.raised_by).name,
                         "created_at": d.created_at.isoformat(), "booking": booking_public(db, b),
                         "chat": [{"from": db.get(m.User, x.sender_id).name, "text": x.text, "kind": x.kind, "payload": x.payload} for x in msgs]})
    flagged = [job_public(j) for j in db.query(m.Job).filter(m.Job.fraud_score >= 0.2).order_by(m.Job.id.desc()).limit(30).all()]
    sos = [{"id": s.id, "user": db.get(m.User, s.user_id).name, "phone": db.get(m.User, s.user_id).phone, "lat": s.lat, "lng": s.lng,
            "booking_id": s.booking_id, "status": s.status, "created_at": s.created_at.isoformat()} for s in db.query(m.SOSAlert).order_by(m.SOSAlert.id.desc()).limit(20).all()]
    biz = [{"id": r.id, "business_name": r.business_name, "business_type": r.business_type, "contact_phone": r.contact_phone, "need": r.need,
            "workers": r.workers, "frequency": r.frequency, "status": r.status} for r in db.query(m.BusinessRequest).order_by(m.BusinessRequest.id.desc()).all()]
    return {"verifications": ver, "skill_verifications": skill_ver, "disputes": disputes, "flagged_jobs": flagged, "sos": sos, "business": biz}


class DecisionIn(BaseModel):
    approve: bool
    kind: str = "id"


@router.post("/admin/verify/{user_id}")
def admin_verify(user_id: int, body: DecisionIn, a: m.User = Depends(get_admin), db: Session = Depends(get_db)):
    u = db.get(m.User, user_id)
    val = "verified" if body.approve else "rejected"
    if body.kind == "id":
        u.id_status = val
    elif body.kind == "face":
        u.face_status = val
    else:
        u.address_status = val
    notify(db, u.id, f"{body.kind.upper()} {val}", "", "", "info")
    db.commit()
    return {"ok": True}


@router.post("/admin/skill-verify/{worker_id}/{skill}")
def admin_skill_verify(worker_id: int, skill: str, body: DecisionIn, a: m.User = Depends(get_admin), db: Session = Depends(get_db)):
    wp = db.get(m.User, worker_id).worker
    skills = [dict(s) for s in wp.skills]
    for s in skills:
        if s["skill"] == skill:
            s["status"] = "verified" if body.approve else "rejected"
            s["verified"] = body.approve
    wp.skills = skills
    notify(db, worker_id, f"Skill {'verified ' if body.approve else 'not approved'}: {SKILL_MAP.get(skill, {}).get('en', skill)}", "", "/worker/profile")
    db.commit()
    return {"ok": True}


class ResolveIn(BaseModel):
    resolution: str
    action: str = "none"  # none | refund | release


@router.post("/admin/disputes/{did}/resolve")
def resolve(did: int, body: ResolveIn, a: m.User = Depends(get_admin), db: Session = Depends(get_db)):
    d = db.get(m.Dispute, did)
    d.status, d.resolution = "resolved", body.resolution
    b = db.get(m.Booking, d.booking_id)
    for p in db.query(m.Payment).filter(m.Payment.booking_id == b.id, m.Payment.status.in_(["held", "pending"])).all():
        if body.action == "refund":
            p.status = "refunded"
        elif body.action == "release":
            p.status = "paid"
            b.status = "paid"
    for uid in (b.worker_id, b.customer_id):
        notify(db, uid, "Dispute resolved", body.resolution[:100], "", "dispute")
    db.commit()
    return {"ok": True}


@router.post("/admin/users/{user_id}/block")
def block(user_id: int, a: m.User = Depends(get_admin), db: Session = Depends(get_db)):
    u = db.get(m.User, user_id)
    u.blocked = not u.blocked
    db.commit()
    return {"blocked": u.blocked}


@router.post("/admin/jobs/{job_id}/remove")
def remove_job(job_id: int, a: m.User = Depends(get_admin), db: Session = Depends(get_db)):
    j = db.get(m.Job, job_id)
    j.status = "cancelled"
    db.commit()
    return {"ok": True}


@router.post("/admin/sos/{sid}/close")
def close_sos(sid: int, a: m.User = Depends(get_admin), db: Session = Depends(get_db)):
    db.get(m.SOSAlert, sid).status = "closed"
    db.commit()
    return {"ok": True}


@router.get("/admin/users")
def admin_users(a: m.User = Depends(get_admin), db: Session = Depends(get_db)):
    return [{**user_public(u), "blocked": u.blocked, "worker": worker_public(u.worker) if u.worker else None}
            for u in db.query(m.User).order_by(m.User.id.desc()).limit(200).all()]


@router.post("/admin/retrain")
def retrain(a: m.User = Depends(get_admin), db: Session = Depends(get_db)):
    return train_model(db)


# demo helper: instant login as a seeded persona (for trying the app quickly)
@router.post("/demo/login/{persona}")
def demo_login(persona: str, db: Session = Depends(get_db)):
    phones = {"customer": "9876500001", "worker": "9876510001", "admin": "9999999999"}
    if persona not in phones:
        raise HTTPException(404, "Unknown persona")
    u = db.query(m.User).filter(m.User.phone == phones[persona]).first()
    from .api_jobs import me_payload
    return {"token": new_token(db, u), "user": me_payload(u)}
