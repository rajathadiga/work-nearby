import secrets
from collections import defaultdict
from datetime import datetime, date as Date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .db import get_db
from . import models as m
from .core import get_user, worker_public, job_public, booking_public, notify, refresh_job_status, create_booking
from .geo import haversine_km, point_to_segment_km, PLACES
from .matching import jobs_for_worker, rank_workers
from .pricing import platform_fee
from .skills import SKILL_MAP

router = APIRouter(prefix="/api")


def _wp(u: m.User) -> m.WorkerProfile:
    if not u.worker:
        raise HTTPException(400, "Create your worker profile first")
    return u.worker


# ------------------------------------------------------------------ worker
@router.get("/worker/feed")
def feed(u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    wp = _wp(u)
    items = jobs_for_worker(db, wp)
    declined = {x.job_id for x in db.query(m.Match).filter(m.Match.worker_id == u.id, m.Match.status == "declined").all()}
    invited = {x.job_id for x in db.query(m.Match).filter(m.Match.worker_id == u.id, m.Match.status == "invited").all()}
    mine = {b.job_id for b in db.query(m.Booking).filter(m.Booking.worker_id == u.id).all()}
    out = []
    for j, r in items:
        if j.id in declined or j.id in mine:
            continue
        d = job_public(j, u.lat, u.lng)
        d["match"] = {"score": r["score"], "reasons": r["reasons"], "breakdown": r["breakdown"], "accept_prob": r["accept_prob"]}
        d["invited"] = j.id in invited
        out.append(d)
    # invited jobs that fall outside normal matching still appear
    for jid in invited - {d["id"] for d in out} - mine:
        j = db.get(m.Job, jid)
        if j and j.status == "open":
            d = job_public(j, u.lat, u.lng)
            d["match"] = {"score": 99, "reasons": ["📩 Customer invited you"], "breakdown": {}, "accept_prob": 0.9}
            d["invited"] = True
            out.insert(0, d)
    out.sort(key=lambda d: (not d["invited"], not d["urgent"], -d["match"]["score"]))
    return out


class ProfileIn(BaseModel):
    bio: str | None = None
    experience_years: int | None = None
    daily_rate: int | None = None
    hourly_rate: int | None = None
    radius_km: float | None = None
    available_from: str | None = None
    available_to: str | None = None
    available_days: list[str] | None = None
    skills: list[dict] | None = None
    upi_id: str | None = None


@router.patch("/worker/profile")
def update_profile(body: ProfileIn, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    wp = _wp(u)
    data = body.model_dump(exclude_none=True)
    if "skills" in data:
        old = {s["skill"]: s for s in wp.skills}
        clean = []
        for s in data["skills"]:
            if s.get("skill") not in SKILL_MAP:
                continue
            prev = old.get(s["skill"], {})
            clean.append({"skill": s["skill"], "level": s.get("level", "intermediate"), "verified": prev.get("verified", False),
                          "status": prev.get("status", "none"), "evidence": prev.get("evidence", ""), "customer_verified": prev.get("customer_verified", 0)})
        data["skills"] = clean
    for k, v in data.items():
        setattr(wp, k, v)
    db.commit()
    return worker_public(wp)


class AvailIn(BaseModel):
    available: bool
    radius_km: float | None = None
    lat: float | None = None
    lng: float | None = None


@router.post("/worker/availability")
def set_availability(body: AvailIn, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    wp = _wp(u)
    wp.available = body.available
    if body.radius_km:
        wp.radius_km = body.radius_km
    if body.lat is not None:
        u.lat, u.lng = body.lat, body.lng
    db.commit()
    count = len(jobs_for_worker(db, wp)) if body.available else 0
    return {"available": wp.available, "radius_km": wp.radius_km, "jobs_nearby": count}


@router.get("/worker/bookings")
def worker_bookings(u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    bs = db.query(m.Booking).filter(m.Booking.worker_id == u.id).order_by(m.Booking.id.desc()).all()
    return [booking_public(db, b) for b in bs]


@router.get("/worker/earnings")
def earnings(u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    wp = _wp(u)
    bs = db.query(m.Booking).filter(m.Booking.worker_id == u.id, m.Booking.status.in_(["completed", "paid"])).all()
    by_day = defaultdict(int)
    by_skill = defaultdict(int)
    today = Date.today()
    week = month = hours = 0
    for b in bs:
        j = db.get(m.Job, b.job_id)
        d = (b.check_out_at or b.created_at).date()
        amt = b.amount
        by_day[d.isoformat()] += amt
        if j.skills:
            by_skill[SKILL_MAP.get(j.skills[0], {}).get("en", j.skills[0])] += amt
        if (today - d).days < 7:
            week += amt
        if d.month == today.month and d.year == today.year:
            month += amt
            if b.check_in_at and b.check_out_at:
                hours += max(0.5, (b.check_out_at - b.check_in_at).total_seconds() / 3600)
            else:
                hours += {"1h": 1, "2h": 2, "3h": 3, "half_day": 4, "full_day": 8, "multi_day": 16}.get(j.duration, 4)
    days = [(today - timedelta(days=i)) for i in range(29, -1, -1)]
    series = [{"date": d.isoformat(), "label": d.strftime("%d %b"), "amount": by_day.get(d.isoformat(), 0)} for d in days]
    month_jobs = sum(1 for b in bs if (b.check_out_at or b.created_at).month == today.month)
    worked_days = len({k for k in by_day if k.startswith(today.strftime("%Y-%m"))}) or 1
    pending = db.query(m.Payment).join(m.Booking, m.Booking.id == m.Payment.booking_id).filter(
        m.Booking.worker_id == u.id, m.Payment.status.in_(["pending", "held"])).all()
    return {"week": week, "month": month, "month_jobs": month_jobs, "avg_per_day": int(month / worked_days), "hours_month": round(hours),
            "total": sum(b.amount for b in bs), "total_jobs": len(bs), "series": series,
            "by_skill": [{"skill": k, "amount": v} for k, v in sorted(by_skill.items(), key=lambda x: -x[1])],
            "pending_amount": sum(p.worker_amount for p in pending), "rating": wp.rating}


@router.get("/worker/route")
def route_jobs(from_place: str, to_place: str, buffer_km: float = 3, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    """Jobs along my route: open jobs within buffer_km of the straight line from A to B."""
    def resolve(name):
        if name == "me":
            return {"name": "My location", "lat": u.lat, "lng": u.lng}
        p = next((p for p in PLACES if p["name"].lower() == name.lower()), None)
        if not p:
            raise HTTPException(400, f"Unknown place {name}")
        return p
    a, b = resolve(from_place), resolve(to_place)
    wp = _wp(u)
    scored = {j.id: r for j, r in jobs_for_worker(db, wp, limit=200)}
    out = []
    for j in db.query(m.Job).filter(m.Job.status == "open", m.Job.customer_id != u.id).all():
        d, t = point_to_segment_km(j.lat, j.lng, a["lat"], a["lng"], b["lat"], b["lng"])
        if d <= buffer_km:
            jd = job_public(j)
            jd["off_route_km"] = round(d, 2)
            jd["route_position"] = round(t, 2)
            jd["match_score"] = scored.get(j.id, {}).get("score")
            out.append(jd)
    out.sort(key=lambda x: (x["match_score"] is None, x["route_position"]))
    return {"from": a, "to": b, "route_km": round(haversine_km(a["lat"], a["lng"], b["lat"], b["lng"]), 1), "jobs": out}


@router.get("/workers/{worker_id}")
def worker_profile(worker_id: int, db: Session = Depends(get_db), u: m.User = Depends(get_user)):
    w = db.get(m.User, worker_id)
    if not w or not w.worker:
        raise HTTPException(404, "Worker not found")
    reviews = db.query(m.Review).filter(m.Review.reviewee_id == worker_id).order_by(m.Review.id.desc()).limit(20).all()
    d = worker_public(w.worker, u.lat, u.lng)
    d["reviews"] = [{"rating": r.rating, "comment": r.comment, "tags": r.tags, "by": db.get(m.User, r.reviewer_id).name,
                     "date": r.created_at.date().isoformat()} for r in reviews]
    d["is_favorite"] = bool(db.query(m.Favorite).filter(m.Favorite.customer_id == u.id, m.Favorite.worker_id == worker_id).first())
    groups = db.query(m.WorkerGroup).all()
    d["groups"] = [g.name for g in groups if worker_id in g.members]
    # skill history: jobs done per skill
    per = defaultdict(int)
    for b in db.query(m.Booking).filter(m.Booking.worker_id == worker_id, m.Booking.status.in_(["completed", "paid"])).all():
        for s in db.get(m.Job, b.job_id).skills:
            per[s] += 1
    d["jobs_per_skill"] = per
    return d


class EvidenceIn(BaseModel):
    url: str


@router.post("/worker/skills/{skill}/verify")
def verify_skill(skill: str, body: EvidenceIn, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    wp = _wp(u)
    skills = [dict(s) for s in wp.skills]
    for s in skills:
        if s["skill"] == skill:
            s["status"] = "pending"
            s["evidence"] = body.url
    wp.skills = skills
    for admin in db.query(m.User).filter(m.User.role == "admin").all():
        notify(db, admin.id, "🎥 Skill video to review", f"{u.name}: {SKILL_MAP.get(skill, {}).get('en', skill)}", "/admin", "admin")
    db.commit()
    return worker_public(wp)


# ------------------------------------------------------------------ bookings
def _booking(db, bid, u) -> m.Booking:
    b = db.get(m.Booking, bid)
    if not b:
        raise HTTPException(404, "Booking not found")
    if u.id not in (b.worker_id, b.customer_id) and u.role != "admin":
        raise HTTPException(403, "Not your booking")
    return b


@router.get("/bookings/{bid}")
def get_booking(bid: int, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    return booking_public(db, _booking(db, bid, u))


class StatusIn(BaseModel):
    status: str
    lat: float | None = None
    lng: float | None = None


@router.post("/bookings/{bid}/status")
def booking_status(bid: int, body: StatusIn, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    b = _booking(db, bid, u)
    j = db.get(m.Job, b.job_id)
    if u.id != b.worker_id:
        raise HTTPException(403, "Only the worker can update this")
    order = ["confirmed", "on_the_way", "arrived", "completed"]
    if body.status not in order or b.status not in order or order.index(body.status) <= order.index(b.status):
        raise HTTPException(400, "Invalid step")
    now = datetime.utcnow()
    if body.status == "on_the_way":
        b.travel_started_at = now
        if body.lat is not None:
            b.start_lat, b.start_lng = body.lat, body.lng
        else:
            b.start_lat, b.start_lng = u.lat, u.lng
        notify(db, b.customer_id, f"🛵 {u.name} is on the way", j.title, f"/customer/jobs/{j.id}", "booking")
    elif body.status == "arrived":
        b.check_in_at = now
        b.check_in_lat = body.lat if body.lat is not None else j.lat
        b.check_in_lng = body.lng if body.lng is not None else j.lng
        if j.date >= Date.today().isoformat():
            u.worker.on_time_count += 1
        notify(db, b.customer_id, f"📍 {u.name} has arrived", "Work is starting", f"/customer/jobs/{j.id}", "booking")
    elif body.status == "completed":
        b.check_out_at = now
        u.worker.jobs_completed += 1
        prev = db.query(m.Booking).filter(m.Booking.worker_id == u.id, m.Booking.customer_id == b.customer_id,
                                          m.Booking.id != b.id, m.Booking.status.in_(["completed", "paid"])).count()
        if prev == 1:
            u.worker.repeat_customers += 1
        notify(db, b.customer_id, f"✅ {u.name} finished the work", "Please check, confirm and pay", f"/customer/jobs/{j.id}", "booking")
    b.status = body.status
    refresh_job_status(db, j)
    db.commit()
    return booking_public(db, b)


class PhotoIn(BaseModel):
    stage: str
    url: str


@router.post("/bookings/{bid}/photos")
def add_photo(bid: int, body: PhotoIn, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    b = _booking(db, bid, u)
    if body.stage == "before":
        b.before_photos = [*b.before_photos, body.url]
    else:
        b.after_photos = [*b.after_photos, body.url]
    db.commit()
    return booking_public(db, b)


@router.post("/bookings/{bid}/confirm")
def confirm_done(bid: int, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    b = _booking(db, bid, u)
    if u.id != b.customer_id:
        raise HTTPException(403, "Only customer can confirm")
    if b.status != "completed":
        raise HTTPException(400, "Worker has not marked the work complete yet")
    b.customer_confirmed = True
    held = db.query(m.Payment).filter(m.Payment.booking_id == b.id, m.Payment.status == "held").first()
    if held:
        held.status = "paid"
        b.status = "paid"
        u.payments_completed += 1
        notify(db, b.worker_id, f"💰 ₹{held.worker_amount} released to you", "Payment from escrow", f"/worker/jobs/{b.job_id}", "payment")
    refresh_job_status(db, db.get(m.Job, b.job_id))
    db.commit()
    return booking_public(db, b)


class PayIn(BaseModel):
    method: str  # cash | upi | online
    tip: int = 0


@router.post("/bookings/{bid}/pay")
def pay(bid: int, body: PayIn, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    b = _booking(db, bid, u)
    j = db.get(m.Job, b.job_id)
    if u.id != b.customer_id:
        raise HTTPException(403, "Only customer pays")
    if b.status not in ("completed",):
        raise HTTPException(400, "Payment is possible after work is completed")
    if db.query(m.Payment).filter(m.Payment.booking_id == b.id, m.Payment.status.in_(["paid", "held"])).first():
        raise HTTPException(400, "Already paid")
    fee = platform_fee(b.amount, j.urgent, u.subscription)
    amount = b.amount + body.tip
    b.customer_confirmed = True
    if body.method == "cash":
        p = m.Payment(booking_id=b.id, amount=amount + fee, platform_fee=fee, worker_amount=amount, method="cash", status="pending")
        notify(db, b.worker_id, "💵 Customer will pay cash", f"Collect ₹{amount} and tap 'Cash received'", f"/worker/jobs/{j.id}", "payment")
    else:
        p = m.Payment(booking_id=b.id, amount=amount + fee, platform_fee=fee, worker_amount=amount, method=body.method, status="paid",
                      reference=("UPI" if body.method == "upi" else "PG") + secrets.token_hex(5).upper())
        b.status = "paid"
        u.payments_completed += 1
        notify(db, b.worker_id, f"💰 ₹{amount} received via {body.method.upper()}", j.title, f"/worker/jobs/{j.id}", "payment")
    b.amount = amount
    db.add(p)
    refresh_job_status(db, j)
    db.commit()
    return booking_public(db, b)


@router.post("/bookings/{bid}/cash-received")
def cash_received(bid: int, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    b = _booking(db, bid, u)
    if u.id != b.worker_id:
        raise HTTPException(403, "Only worker can confirm cash")
    p = db.query(m.Payment).filter(m.Payment.booking_id == b.id, m.Payment.status == "pending").first()
    if not p:
        raise HTTPException(400, "No pending cash payment")
    p.status = "paid"
    b.status = "paid"
    cust = db.get(m.User, b.customer_id)
    cust.payments_completed += 1
    refresh_job_status(db, db.get(m.Job, b.job_id))
    db.commit()
    return booking_public(db, b)


class ReviewIn(BaseModel):
    rating: int
    comment: str = ""
    tags: list[str] = []


@router.post("/bookings/{bid}/review")
def review(bid: int, body: ReviewIn, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    b = _booking(db, bid, u)
    rating = max(1, min(5, body.rating))
    if u.id == b.customer_id:
        if b.reviewed_by_customer:
            raise HTTPException(400, "Already reviewed")
        wp = db.get(m.User, b.worker_id).worker
        wp.rating = (wp.rating * wp.rating_count + rating) / (wp.rating_count + 1)
        wp.rating_count += 1
        b.reviewed_by_customer = True
        reviewee = b.worker_id
        if rating >= 4:  # "verified by customer" skill signal
            j = db.get(m.Job, b.job_id)
            skills = [dict(s) for s in wp.skills]
            for s in skills:
                if s["skill"] in j.skills:
                    s["customer_verified"] = s.get("customer_verified", 0) + 1
                    if s["customer_verified"] >= 3 and not s.get("verified"):
                        s["verified"] = True
                        s["status"] = "verified"
            wp.skills = skills
    elif u.id == b.worker_id:
        if b.reviewed_by_worker:
            raise HTTPException(400, "Already reviewed")
        c = db.get(m.User, b.customer_id)
        c.customer_rating = (c.customer_rating * c.customer_rating_count + rating) / (c.customer_rating_count + 1)
        c.customer_rating_count += 1
        b.reviewed_by_worker = True
        reviewee = b.customer_id
    else:
        raise HTTPException(403, "Not allowed")
    db.add(m.Review(booking_id=b.id, reviewer_id=u.id, reviewee_id=reviewee, rating=rating, comment=body.comment, tags=body.tags))
    notify(db, reviewee, f"⭐ You got {rating} stars from {u.name}", body.comment[:80], "", "review")
    db.commit()
    return booking_public(db, b)


@router.post("/bookings/{bid}/no-show")
def no_show(bid: int, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    """Work guarantee: worker didn't come -> mark no-show, find & notify replacement workers automatically."""
    b = _booking(db, bid, u)
    if u.id != b.customer_id:
        raise HTTPException(403, "Only customer")
    if b.status not in ("confirmed", "on_the_way"):
        raise HTTPException(400, "Cannot mark no-show now")
    b.status = "no_show"
    w = db.get(m.User, b.worker_id)
    w.worker.cancellations += 1
    j = db.get(m.Job, b.job_id)
    for p in db.query(m.Payment).filter(m.Payment.booking_id == b.id, m.Payment.status == "held").all():
        p.status = "refunded"
    refresh_job_status(db, j)
    notify(db, w.id, "⚠️ Marked as no-show", f"Customer reported you did not come for {j.title}", f"/worker/jobs/{j.id}")
    ranked = [r for r in rank_workers(db, j, limit=10) if r["worker_id"] != w.id][:5]
    for r in ranked:
        mt = db.query(m.Match).filter(m.Match.job_id == j.id, m.Match.worker_id == r["worker_id"]).first()
        if mt and mt.status in ("declined", "accepted"):
            continue
        if not mt:
            db.add(m.Match(job_id=j.id, worker_id=r["worker_id"], score=r["score"], accept_prob=r["accept_prob"], status="notified",
                           breakdown={"parts": r["breakdown"], "reasons": r["reasons"]}))
        else:
            mt.status = "notified"
        notify(db, r["worker_id"], f"🚨 Replacement needed: {j.title}", f"📍 {r['distance_km']} km • ₹{j.budget} • Today", f"/worker/jobs/{j.id}", "job_alert")
    db.commit()
    return {"ok": True, "replacements_notified": len(ranked)}


@router.post("/bookings/{bid}/cancel")
def cancel_booking(bid: int, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    b = _booking(db, bid, u)
    if b.status not in ("confirmed", "on_the_way"):
        raise HTTPException(400, "Cannot cancel now")
    b.status = "cancelled"
    j = db.get(m.Job, b.job_id)
    if u.id == b.worker_id:
        u.worker.cancellations += 1
        notify(db, b.customer_id, f"⚠️ {u.name} cancelled", "We are finding another worker for you", f"/customer/jobs/{j.id}")
        from .matching import run_matching
        refresh_job_status(db, j)
        db.commit()
        run_matching(db, j, notify=True)
    else:
        u.cancellations += 1
        notify(db, b.worker_id, "❌ Customer cancelled your booking", j.title, f"/worker/jobs/{j.id}")
    for p in db.query(m.Payment).filter(m.Payment.booking_id == b.id, m.Payment.status == "held").all():
        p.status = "refunded"
    refresh_job_status(db, j)
    db.commit()
    return booking_public(db, b)


class DisputeIn(BaseModel):
    reason: str


@router.post("/bookings/{bid}/dispute")
def dispute(bid: int, body: DisputeIn, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    b = _booking(db, bid, u)
    db.add(m.Dispute(booking_id=b.id, raised_by=u.id, reason=body.reason))
    other = b.worker_id if u.id == b.customer_id else b.customer_id
    notify(db, other, "⚖️ A problem was reported", body.reason[:80], "", "dispute")
    for admin in db.query(m.User).filter(m.User.role == "admin").all():
        notify(db, admin.id, "⚖️ New dispute", body.reason[:80], "/admin", "admin")
    db.commit()
    return booking_public(db, b)


@router.get("/track/{token}")
def public_track(token: str, db: Session = Depends(get_db)):
    """Safety: shareable live link for a trusted contact (no login)."""
    b = db.query(m.Booking).filter(m.Booking.share_token == token).first()
    if not b:
        raise HTTPException(404, "Link expired")
    j = db.get(m.Job, b.job_id)
    w = db.get(m.User, b.worker_id)
    c = db.get(m.User, b.customer_id)
    from .core import travel_state
    return {"status": b.status, "job": {"title": j.title, "address": j.address, "lat": j.lat, "lng": j.lng, "date": j.date},
            "worker": {"name": w.name, "phone": w.phone}, "customer": {"name": c.name},
            "tracking": travel_state(b, j), "check_in_at": b.check_in_at.isoformat() if b.check_in_at else None,
            "check_out_at": b.check_out_at.isoformat() if b.check_out_at else None}
