import os
from datetime import datetime, date as Date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .db import get_db
from . import models as m
from .core import get_user, new_token, user_public, worker_public, job_public, booking_public, notify, create_booking, refresh_job_status
from .skills import CATEGORIES, SKILLS, SKILL_MAP, SAFETY_CRITICAL
from .geo import PLACES, nearest_place, find_place
from .parser import understand, parse_availability_text, generate_tasks, make_title
from .pricing import suggest_price
from .fraud import assess_job, check_text
from .matching import run_matching, rank_workers

router = APIRouter(prefix="/api")
DEMO_OTP = "1234"


# ------------------------------------------------------------------ meta
@router.get("/meta")
def meta():
    return {"categories": CATEGORIES, "skills": SKILLS, "places": PLACES, "safety_critical": sorted(SAFETY_CRITICAL),
            "llm_enabled": bool(os.getenv("ANTHROPIC_API_KEY")), "demo_otp": DEMO_OTP,
            "plans": {"pro": {"price": 99, "for": "worker"}, "homecare": {"price": 199, "for": "customer"}}}


# ------------------------------------------------------------------ auth
class OtpIn(BaseModel):
    phone: str


class VerifyIn(BaseModel):
    phone: str
    otp: str
    name: str = ""
    role: str = ""
    language: str = "en"
    lat: float | None = None
    lng: float | None = None


def _clean_phone(p: str) -> str:
    digits = "".join(ch for ch in p if ch.isdigit())[-10:]
    if len(digits) != 10:
        raise HTTPException(400, "Enter a 10 digit mobile number")
    return digits


@router.post("/auth/send-otp")
def send_otp(body: OtpIn, db: Session = Depends(get_db)):
    phone = _clean_phone(body.phone)
    u = db.query(m.User).filter(m.User.phone == phone).first()
    return {"sent": True, "demo_otp": DEMO_OTP, "exists": bool(u), "name": u.name if u else ""}


@router.post("/auth/verify")
def verify(body: VerifyIn, db: Session = Depends(get_db)):
    phone = _clean_phone(body.phone)
    if body.otp.strip() != DEMO_OTP:
        raise HTTPException(400, "Wrong OTP")
    u = db.query(m.User).filter(m.User.phone == phone).first()
    is_new = u is None
    if is_new:
        role = body.role if body.role in ("customer", "worker") else "customer"
        lat, lng = (body.lat, body.lng) if body.lat else (13.3409, 74.7421)
        u = m.User(phone=phone, name=body.name or "Friend", role=role, language=body.language, lat=lat, lng=lng, area=nearest_place(lat, lng))
        db.add(u)
        db.flush()
        if role == "worker":
            db.add(m.WorkerProfile(user=u, user_id=u.id, skills=[], available=False))
        db.commit()
    else:
        if body.language:
            u.language = body.language
        if body.role in ("customer", "worker") and u.role != "admin":
            u.role = body.role
            if body.role == "worker" and not u.worker:
                db.add(m.WorkerProfile(user=u, user_id=u.id, skills=[]))
        db.commit()
        db.refresh(u)
    return {"token": new_token(db, u), "user": me_payload(u), "is_new": is_new}


def me_payload(u: m.User) -> dict:
    d = user_public(u)
    d["worker"] = worker_public(u.worker) if u.worker else None
    return d


@router.get("/me")
def me(u: m.User = Depends(get_user)):
    return me_payload(u)


class MeIn(BaseModel):
    name: str | None = None
    language: str | None = None
    lat: float | None = None
    lng: float | None = None
    area: str | None = None
    role: str | None = None
    trusted_contact_name: str | None = None
    trusted_contact_phone: str | None = None
    business_name: str | None = None
    avatar: str | None = None


@router.patch("/me")
def update_me(body: MeIn, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    for k, v in body.model_dump(exclude_none=True).items():
        if k == "role" and (v not in ("customer", "worker") or u.role == "admin"):
            continue
        setattr(u, k, v)
    if body.lat is not None and body.lng is not None and not body.area:
        u.area = nearest_place(body.lat, body.lng)
    if u.role == "worker" and not u.worker:
        db.add(m.WorkerProfile(user=u, user_id=u.id, skills=[]))
    db.commit()
    db.refresh(u)
    return me_payload(u)


# ------------------------------------------------------------------ AI helpers
class ParseIn(BaseModel):
    text: str
    lat: float | None = None
    lng: float | None = None


@router.post("/ai/parse")
def ai_parse(body: ParseIn, db: Session = Depends(get_db)):
    p = understand(body.text)
    lat, lng = body.lat, body.lng
    place = find_place(body.text)
    if place:
        lat, lng = place["lat"], place["lng"]
    if lat is not None:
        p["price"] = suggest_price(db, p["skills"], p["duration"], p["quantity"], p["workers_required"], lat, lng, p["date"], p["urgent"])
    blocks, warns = check_text(body.text)
    p["warnings"] = blocks + warns
    return p


class PriceIn(BaseModel):
    skills: list[str]
    duration: str = "half_day"
    quantity: int = 0
    workers_required: int = 1
    lat: float
    lng: float
    date: str = ""
    urgent: bool = False


@router.post("/ai/price")
def ai_price(body: PriceIn, db: Session = Depends(get_db)):
    return suggest_price(db, body.skills, body.duration, body.quantity, body.workers_required, body.lat, body.lng, body.date, body.urgent)


class TasksIn(BaseModel):
    skills: list[str]
    quantity: int = 0
    workers_required: int = 1


@router.post("/ai/describe")
def ai_describe(body: TasksIn):
    return {"title": make_title(body.skills, body.quantity, body.workers_required), "tasks": generate_tasks(body.skills)}


class TextIn(BaseModel):
    text: str


@router.post("/ai/availability")
def ai_availability(body: TextIn):
    return parse_availability_text(body.text)


# ------------------------------------------------------------------ jobs
class JobIn(BaseModel):
    title: str = ""
    description: str = ""
    category: str = "other"
    skills: list[str] = []
    tasks: list[str] = []
    lat: float
    lng: float
    address: str = ""
    date: str = ""
    time_slot: str = "flexible"
    urgent: bool = False
    budget: int = 0
    pay_type: str = "fixed"
    duration: str = "half_day"
    quantity: int = 0
    workers_required: int = 1
    payment_method: str = "cash"
    escrow: bool = False
    recurring: dict = {}
    photos: list[str] = []
    source: str = "web"
    preferred_worker_id: int = 0


def create_job_record(db: Session, u: m.User, body: JobIn) -> tuple[m.Job, dict, list]:
    if not body.skills and body.description:
        p = understand(body.description)
        body.skills = p["skills"]
        body.category = body.category if body.category != "other" else p["category"]
    if not body.title:
        body.title = make_title(body.skills, body.quantity, body.workers_required)
    if not body.tasks:
        body.tasks = generate_tasks(body.skills)
    if not body.date:
        body.date = Date.today().isoformat()
    if body.urgent:
        body.time_slot = "asap"
        body.date = Date.today().isoformat()
    price = suggest_price(db, body.skills, body.duration, body.quantity, body.workers_required, body.lat, body.lng, body.date, body.urgent)
    if not body.budget:
        body.budget = price["suggested"]
    recent = db.query(m.Job).filter(m.Job.customer_id == u.id, m.Job.created_at >= datetime.utcnow() - timedelta(hours=1)).count()
    risk = assess_job(f"{body.title} {body.description}", body.budget, price["suggested"], u.cancellations, recent)
    if risk["blocked"]:
        raise HTTPException(400, "This job was blocked for safety: " + "; ".join(risk["flags"]))
    body.address = body.address or nearest_place(body.lat, body.lng)
    j = m.Job(customer_id=u.id, **body.model_dump(), price_estimate=price, flags=risk["flags"], fraud_score=risk["score"])
    db.add(j)
    u.jobs_posted += 1
    db.commit()
    db.refresh(j)
    ranked = run_matching(db, j, notify=risk["score"] < 0.5)
    if j.preferred_worker_id:
        mt = db.query(m.Match).filter(m.Match.job_id == j.id, m.Match.worker_id == j.preferred_worker_id).first()
        if mt:
            mt.status = "invited"
        else:
            db.add(m.Match(job_id=j.id, worker_id=j.preferred_worker_id, score=95, status="invited", breakdown={"reasons": ["❤️ Your saved worker"], "parts": {}}))
        notify(db, j.preferred_worker_id, f"❤️ {u.name} wants to book you again", f"{j.title} • {j.date} • ₹{j.budget}", f"/worker/jobs/{j.id}", "job_alert")
        db.commit()
    return j, risk, ranked


@router.post("/jobs")
def create_job(body: JobIn, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    j, risk, ranked = create_job_record(db, u, body)
    return {"job": job_public(j), "risk": risk, "matches": len(ranked)}


@router.get("/jobs/mine")
def my_jobs(u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    jobs = db.query(m.Job).filter(m.Job.customer_id == u.id).order_by(m.Job.created_at.desc()).all()
    out = []
    for j in jobs:
        d = job_public(j)
        bs = db.query(m.Booking).filter(m.Booking.job_id == j.id, m.Booking.status.notin_(["cancelled", "no_show"])).all()
        d["bookings"] = [{"id": b.id, "status": b.status, "worker_name": db.get(m.User, b.worker_id).name, "worker_id": b.worker_id} for b in bs]
        d["match_count"] = db.query(m.Match).filter(m.Match.job_id == j.id).count()
        out.append(d)
    return out


def _match_rows(db: Session, j: m.Job, lat, lng):
    rows = db.query(m.Match).filter(m.Match.job_id == j.id).order_by(m.Match.score.desc()).all()
    out = []
    for r in rows:
        w = db.get(m.User, r.worker_id)
        if not w or not w.worker:
            continue
        out.append({"match_id": r.id, "status": r.status, "score": r.score, "accept_prob": r.accept_prob,
                    "breakdown": (r.breakdown or {}).get("parts", {}), "reasons": (r.breakdown or {}).get("reasons", []),
                    "worker": worker_public(w.worker, j.lat, j.lng)})
    return out


@router.get("/jobs/{job_id}")
def get_job(job_id: int, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    j = db.get(m.Job, job_id)
    if not j:
        raise HTTPException(404, "Job not found")
    d = job_public(j, u.lat, u.lng)
    cust = db.get(m.User, j.customer_id)
    d["customer"] = user_public(cust)
    d["customer"]["phone"] = cust.phone
    bs = db.query(m.Booking).filter(m.Booking.job_id == j.id).order_by(m.Booking.id).all()
    is_owner = j.customer_id == u.id or u.role == "admin"
    d["is_owner"] = is_owner
    d["bookings"] = [booking_public(db, b, with_job=False) for b in bs if is_owner or b.worker_id == u.id]
    d["slots_left"] = j.workers_required - len([b for b in bs if b.status not in ("cancelled", "no_show")])
    if is_owner:
        d["matches"] = _match_rows(db, j, j.lat, j.lng)
    else:
        mt = db.query(m.Match).filter(m.Match.job_id == j.id, m.Match.worker_id == u.id).first()
        d["my_match"] = ({"score": mt.score, "status": mt.status, "reasons": (mt.breakdown or {}).get("reasons", []),
                          "breakdown": (mt.breakdown or {}).get("parts", {})} if mt else None)
        d["safety_tips"] = [s for s in j.skills if s in SAFETY_CRITICAL]
        d["confirmed_team"] = [db.get(m.User, b.worker_id).name for b in bs if b.status not in ("cancelled", "no_show")]
    return d


def _own_job(db, job_id, u) -> m.Job:
    j = db.get(m.Job, job_id)
    if not j:
        raise HTTPException(404, "Job not found")
    if j.customer_id != u.id and u.role != "admin":
        raise HTTPException(403, "Not your job")
    return j


@router.post("/jobs/{job_id}/rematch")
def rematch(job_id: int, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    j = _own_job(db, job_id, u)
    ranked = run_matching(db, j, notify=True)
    return {"matches": len(ranked)}


class WorkerRef(BaseModel):
    worker_id: int


@router.post("/jobs/{job_id}/invite")
def invite(job_id: int, body: WorkerRef, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    j = _own_job(db, job_id, u)
    mt = db.query(m.Match).filter(m.Match.job_id == j.id, m.Match.worker_id == body.worker_id).first()
    if not mt:
        mt = m.Match(job_id=j.id, worker_id=body.worker_id, score=0, breakdown={})
        db.add(mt)
    mt.status = "invited"
    notify(db, body.worker_id, f"📩 {u.name} invited you: {j.title}", f"📅 {j.date} • 💰 ₹{j.budget}", f"/worker/jobs/{j.id}", "job_alert")
    db.commit()
    return {"ok": True}


@router.post("/jobs/{job_id}/hire")
def hire(job_id: int, body: WorkerRef, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    j = _own_job(db, job_id, u)
    w = db.get(m.User, body.worker_id)
    if not w or not w.worker:
        raise HTTPException(404, "Worker not found")
    b = create_booking(db, j, w, by="customer")
    db.commit()
    return booking_public(db, b)


@router.post("/jobs/{job_id}/cancel")
def cancel_job(job_id: int, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    j = _own_job(db, job_id, u)
    active = db.query(m.Booking).filter(m.Booking.job_id == j.id, m.Booking.status.in_(["confirmed", "on_the_way", "arrived"])).all()
    for b in active:
        b.status = "cancelled"
        notify(db, b.worker_id, f"❌ Job cancelled: {j.title}", "The customer cancelled this job", f"/worker/jobs/{j.id}")
        for p in db.query(m.Payment).filter(m.Payment.booking_id == b.id, m.Payment.status == "held").all():
            p.status = "refunded"
    if active:
        u.cancellations += 1
    j.status = "cancelled"
    db.commit()
    return {"ok": True}


class GroupRef(BaseModel):
    group_id: int


@router.post("/jobs/{job_id}/notify-group")
def notify_group(job_id: int, body: GroupRef, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    j = _own_job(db, job_id, u)
    g = db.get(m.WorkerGroup, body.group_id)
    if not g:
        raise HTTPException(404, "Group not found")
    for wid in g.members:
        if not db.query(m.Match).filter(m.Match.job_id == j.id, m.Match.worker_id == wid).first():
            db.add(m.Match(job_id=j.id, worker_id=wid, score=60, status="notified", breakdown={"reasons": [f"👥 Member of {g.name}"], "parts": {}}))
        notify(db, wid, f"👥 Group work: {j.title}", f"{j.workers_required} workers needed • ₹{j.budget}/person • {j.date}", f"/worker/jobs/{j.id}", "job_alert")
    db.commit()
    return {"notified": len(g.members)}


@router.post("/jobs/{job_id}/accept")
def accept(job_id: int, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    j = db.get(m.Job, job_id)
    if not j or j.status in ("cancelled", "completed"):
        raise HTTPException(400, "This job is no longer available")
    if not u.worker:
        raise HTTPException(400, "Create a worker profile first")
    if j.customer_id == u.id:
        raise HTTPException(400, "You cannot accept your own job")
    b = create_booking(db, j, u, by="worker")
    db.commit()
    return booking_public(db, b)


@router.post("/jobs/{job_id}/decline")
def decline(job_id: int, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    mt = db.query(m.Match).filter(m.Match.job_id == job_id, m.Match.worker_id == u.id).first()
    if mt:
        mt.status = "declined"
    else:
        db.add(m.Match(job_id=job_id, worker_id=u.id, score=0, status="declined", breakdown={}))
    db.commit()
    return {"ok": True}


# ------------------------------------------------------------------ chat
class MsgIn(BaseModel):
    to: int
    text: str = ""
    kind: str = "text"
    payload: dict = {}


@router.get("/jobs/{job_id}/messages")
def messages(job_id: int, with_user: int = 0, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    q = db.query(m.Message).filter(m.Message.job_id == job_id,
                                   ((m.Message.sender_id == u.id) | (m.Message.receiver_id == u.id)))
    if with_user:
        q = q.filter((m.Message.sender_id == with_user) | (m.Message.receiver_id == with_user))
    return [{"id": x.id, "sender_id": x.sender_id, "receiver_id": x.receiver_id, "kind": x.kind, "text": x.text,
             "payload": x.payload, "created_at": x.created_at.isoformat() + "Z"} for x in q.order_by(m.Message.id).all()]


@router.post("/jobs/{job_id}/messages")
def send_message(job_id: int, body: MsgIn, u: m.User = Depends(get_user), db: Session = Depends(get_db)):
    j = db.get(m.Job, job_id)
    if not j:
        raise HTTPException(404, "Job not found")
    blocks, warns = check_text(body.text)
    if blocks:
        raise HTTPException(400, "Message blocked for your safety: " + "; ".join(blocks))
    msg = m.Message(job_id=job_id, sender_id=u.id, receiver_id=body.to, kind=body.kind, text=body.text, payload=body.payload)
    db.add(msg)
    link = f"/customer/jobs/{job_id}" if body.to == j.customer_id else f"/worker/jobs/{job_id}"
    notify(db, body.to, f"💬 {u.name}", body.text[:80] or ("📷 Photo" if body.kind == "image" else "📍 Location"), link, "chat")
    db.commit()
    return {"ok": True, "warnings": warns}
