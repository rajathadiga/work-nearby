"""Shared helpers: auth dependency, serializers, notifications, booking lifecycle rules."""
from datetime import datetime, date as Date, timedelta
import secrets

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .db import get_db
from . import models as m
from .geo import haversine_km
from .matching import reliability
from .skills import SKILL_MAP


def get_user(authorization: str = Header(default=""), db: Session = Depends(get_db)) -> m.User:
    tok = authorization.replace("Bearer ", "").strip()
    row = db.get(m.Token, tok) if tok else None
    if not row:
        raise HTTPException(401, "Please log in")
    u = db.get(m.User, row.user_id)
    if not u or u.blocked:
        raise HTTPException(403, "Account blocked")
    return u


def get_admin(u: m.User = Depends(get_user)) -> m.User:
    if u.role != "admin":
        raise HTTPException(403, "Admin only")
    return u


def new_token(db: Session, user: m.User) -> str:
    t = secrets.token_hex(24)
    db.add(m.Token(token=t, user_id=user.id))
    db.commit()
    return t


def notify(db: Session, user_id: int, title: str, body: str = "", link: str = "", kind: str = "info"):
    db.add(m.Notification(user_id=user_id, title=title, body=body, link=link, kind=kind))


def verification_level(u: m.User, wp: m.WorkerProfile | None = None) -> str:
    if u.id_status == "verified":
        if wp and wp.jobs_completed >= 20 and wp.rating >= 4.3:
            return "trusted"
        return "verified"
    return "basic"


def user_public(u: m.User) -> dict:
    return {"id": u.id, "name": u.name, "phone": u.phone, "role": u.role, "language": u.language, "lat": u.lat, "lng": u.lng,
            "area": u.area, "avatar": u.avatar, "subscription": u.subscription,
            "verification": {"phone": u.phone_verified, "id": u.id_status, "face": u.face_status, "address": u.address_status},
            "customer": {"rating": round(u.customer_rating, 1), "rating_count": u.customer_rating_count, "jobs_posted": u.jobs_posted,
                         "payments_completed": u.payments_completed, "cancellations": u.cancellations},
            "trusted_contact": {"name": u.trusted_contact_name, "phone": u.trusted_contact_phone},
            "business_name": u.business_name, "created_at": u.created_at.isoformat()}


def worker_public(wp: m.WorkerProfile, lat: float | None = None, lng: float | None = None) -> dict:
    u = wp.user
    rel = reliability(wp)
    d = {
        "id": u.id, "name": u.name, "avatar": u.avatar, "area": u.area, "lat": u.lat, "lng": u.lng, "phone": u.phone,
        "language": u.language, "subscription": u.subscription,
        "bio": wp.bio, "experience_years": wp.experience_years, "daily_rate": wp.daily_rate, "hourly_rate": wp.hourly_rate,
        "radius_km": wp.radius_km, "available": wp.available, "available_from": wp.available_from, "available_to": wp.available_to,
        "available_days": wp.available_days, "upi_id": wp.upi_id,
        "skills": [{**s, "name": SKILL_MAP.get(s["skill"], {}).get("en", s["skill"]), "icon": SKILL_MAP.get(s["skill"], {}).get("icon", "")} for s in wp.skills],
        "rating": round(wp.rating, 1), "rating_count": wp.rating_count, "jobs_completed": wp.jobs_completed,
        "repeat_customers": wp.repeat_customers, "avg_response_min": wp.avg_response_min,
        "reliability": rel, "verification": {"phone": u.phone_verified, "id": u.id_status, "face": u.face_status, "address": u.address_status},
        "level": verification_level(u, wp),
    }
    if lat is not None:
        d["distance_km"] = round(haversine_km(lat, lng, u.lat, u.lng), 2)
    return d


def job_public(j: m.Job, lat: float | None = None, lng: float | None = None) -> dict:
    d = {c.name: getattr(j, c.name) for c in j.__table__.columns}
    d["created_at"] = j.created_at.isoformat()
    d["skill_names"] = [SKILL_MAP.get(s, {}).get("en", s) for s in j.skills]
    d["icon"] = SKILL_MAP[j.skills[0]]["icon"] if j.skills and j.skills[0] in SKILL_MAP else ""
    if lat is not None:
        d["distance_km"] = round(haversine_km(lat, lng, j.lat, j.lng), 2)
    return d


def travel_state(b: m.Booking, j: m.Job) -> dict:
    """Simulated live tracking between worker start point and job location."""
    dist = haversine_km(b.start_lat, b.start_lng, j.lat, j.lng)
    total_min = max(3.0, dist * 3.0)  # ~20 km/h in town traffic
    if b.status == "on_the_way" and b.travel_started_at:
        elapsed = (datetime.utcnow() - b.travel_started_at).total_seconds() / 60
        f = min(0.97, elapsed / total_min)
        lat = b.start_lat + (j.lat - b.start_lat) * f
        lng = b.start_lng + (j.lng - b.start_lng) * f
        return {"lat": lat, "lng": lng, "eta_min": max(1, round(total_min * (1 - f))), "distance_km": round(dist * (1 - f), 2)}
    if b.status in ("arrived", "completed", "paid"):
        return {"lat": j.lat, "lng": j.lng, "eta_min": 0, "distance_km": 0}
    return {"lat": b.start_lat, "lng": b.start_lng, "eta_min": round(total_min), "distance_km": round(dist, 2)}


def booking_public(db: Session, b: m.Booking, with_job=True) -> dict:
    j = db.get(m.Job, b.job_id)
    w = db.get(m.User, b.worker_id)
    c = db.get(m.User, b.customer_id)
    pay = db.query(m.Payment).filter(m.Payment.booking_id == b.id).order_by(m.Payment.id.desc()).first()
    dispute = db.query(m.Dispute).filter(m.Dispute.booking_id == b.id).order_by(m.Dispute.id.desc()).first()
    d = {c_.name: getattr(b, c_.name) for c_ in b.__table__.columns}
    for k in ["travel_started_at", "check_in_at", "check_out_at", "created_at"]:
        d[k] = d[k].isoformat() if d[k] else None
    d["worker"] = worker_public(w.worker) if w and w.worker else None
    d["customer"] = user_public(c) if c else None
    d["tracking"] = travel_state(b, j)
    d["payment"] = ({"id": pay.id, "amount": pay.amount, "platform_fee": pay.platform_fee, "worker_amount": pay.worker_amount,
                     "method": pay.method, "status": pay.status, "reference": pay.reference} if pay else None)
    d["dispute"] = ({"id": dispute.id, "reason": dispute.reason, "status": dispute.status, "resolution": dispute.resolution} if dispute else None)
    if with_job:
        d["job"] = job_public(j)
    return d


def refresh_job_status(db: Session, j: m.Job):
    bs = db.query(m.Booking).filter(m.Booking.job_id == j.id, m.Booking.status.notin_(["cancelled", "no_show"])).all()
    if j.status == "cancelled":
        return
    if not bs:
        j.status = "open"
    elif all(b.status == "paid" or (b.status == "completed" and b.customer_confirmed) for b in bs) and len(bs) >= j.workers_required:
        if j.status != "completed":
            j.status = "completed"
            spawn_recurring(db, j, bs[0].worker_id)
    elif any(b.status in ("on_the_way", "arrived", "completed", "paid") for b in bs):
        j.status = "in_progress"
    elif len(bs) >= j.workers_required:
        j.status = "assigned"
    else:
        j.status = "open"


def spawn_recurring(db: Session, j: m.Job, worker_id: int):
    """Recurring work: create the next occurrence and auto-invite the same worker."""
    if not j.recurring or not j.recurring.get("freq"):
        return
    try:
        d = Date.fromisoformat(j.date)
    except ValueError:
        d = Date.today()
    nxt = d + (timedelta(days=1) if j.recurring["freq"] == "daily" else timedelta(days=7))
    if nxt <= Date.today():
        nxt = Date.today() + timedelta(days=1 if j.recurring["freq"] == "daily" else 7)
    cols = {c.name: getattr(j, c.name) for c in j.__table__.columns if c.name not in ("id", "created_at", "status", "date", "parent_job_id", "preferred_worker_id", "flags")}
    nj = m.Job(**cols, date=nxt.isoformat(), status="open", parent_job_id=j.parent_job_id or j.id, preferred_worker_id=worker_id, flags=[])
    db.add(nj)
    db.flush()
    db.add(m.Match(job_id=nj.id, worker_id=worker_id, score=99, accept_prob=0.9, status="invited",
                   breakdown={"reasons": ["Your regular customer"], "parts": {}}))
    notify(db, worker_id, f"Repeat work: {nj.title}", f"Your regular customer booked you again for {nj.date}", f"/worker/jobs/{nj.id}", "job_alert")
    notify(db, j.customer_id, f"Next {nj.title} scheduled", f"{nj.date} — same worker invited", f"/customer/jobs/{nj.id}")


def create_booking(db: Session, j: m.Job, worker: m.User, by: str) -> m.Booking:
    existing = db.query(m.Booking).filter(m.Booking.job_id == j.id, m.Booking.worker_id == worker.id,
                                          m.Booking.status.notin_(["cancelled", "no_show"])).first()
    if existing:
        return existing
    active = db.query(m.Booking).filter(m.Booking.job_id == j.id, m.Booking.status.notin_(["cancelled", "no_show"])).count()
    if active >= j.workers_required:
        raise HTTPException(400, "All worker slots for this job are already filled")
    b = m.Booking(job_id=j.id, worker_id=worker.id, customer_id=j.customer_id, amount=j.budget, status="confirmed",
                  start_lat=worker.lat, start_lng=worker.lng, share_token=secrets.token_hex(8))
    db.add(b)
    worker.worker.jobs_accepted += 1
    mt = db.query(m.Match).filter(m.Match.job_id == j.id, m.Match.worker_id == worker.id).first()
    if mt:
        mt.status = "accepted"
    else:
        db.add(m.Match(job_id=j.id, worker_id=worker.id, score=0, status="accepted", breakdown={}))
    db.flush()
    if j.escrow:
        from .pricing import platform_fee
        cust = db.get(m.User, j.customer_id)
        fee = platform_fee(b.amount, j.urgent, cust.subscription)
        db.add(m.Payment(booking_id=b.id, amount=b.amount + fee, platform_fee=fee, worker_amount=b.amount, method="online",
                         status="held", reference="ESC" + secrets.token_hex(4).upper()))
    if by == "worker":
        notify(db, j.customer_id, f"{worker.name} accepted your job", j.title, f"/customer/jobs/{j.id}", "booking")
    else:
        notify(db, worker.id, f"You are hired: {j.title}", f"{j.date} • ₹{j.budget}", f"/worker/jobs/{j.id}", "booking")
    refresh_job_status(db, j)
    return b
