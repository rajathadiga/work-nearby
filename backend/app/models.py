from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base


def now():
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), default="")
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    role: Mapped[str] = mapped_column(String(20), default="customer")  # customer | worker | admin
    language: Mapped[str] = mapped_column(String(5), default="en")
    lat: Mapped[float] = mapped_column(Float, default=13.3409)
    lng: Mapped[float] = mapped_column(Float, default=74.7421)
    area: Mapped[str] = mapped_column(String(80), default="Udupi")
    avatar: Mapped[str] = mapped_column(String(300), default="")
    # verification
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    id_status: Mapped[str] = mapped_column(String(20), default="none")  # none | pending | verified | rejected
    face_status: Mapped[str] = mapped_column(String(20), default="none")
    address_status: Mapped[str] = mapped_column(String(20), default="none")
    id_doc: Mapped[str] = mapped_column(String(300), default="")
    face_doc: Mapped[str] = mapped_column(String(300), default="")
    # customer reputation
    customer_rating: Mapped[float] = mapped_column(Float, default=0)
    customer_rating_count: Mapped[int] = mapped_column(Integer, default=0)
    jobs_posted: Mapped[int] = mapped_column(Integer, default=0)
    payments_completed: Mapped[int] = mapped_column(Integer, default=0)
    cancellations: Mapped[int] = mapped_column(Integer, default=0)
    # misc
    subscription: Mapped[str] = mapped_column(String(20), default="free")  # free | pro | homecare
    trusted_contact_name: Mapped[str] = mapped_column(String(80), default="")
    trusted_contact_phone: Mapped[str] = mapped_column(String(20), default="")
    business_name: Mapped[str] = mapped_column(String(120), default="")
    blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    worker: Mapped["WorkerProfile"] = relationship(back_populates="user", uselist=False)


class Token(Base):
    __tablename__ = "tokens"
    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))


class WorkerProfile(Base):
    __tablename__ = "worker_profiles"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    bio: Mapped[str] = mapped_column(Text, default="")
    experience_years: Mapped[int] = mapped_column(Integer, default=1)
    daily_rate: Mapped[int] = mapped_column(Integer, default=700)
    hourly_rate: Mapped[int] = mapped_column(Integer, default=120)
    radius_km: Mapped[float] = mapped_column(Float, default=10)
    available: Mapped[bool] = mapped_column(Boolean, default=False)
    available_from: Mapped[str] = mapped_column(String(5), default="08:00")
    available_to: Mapped[str] = mapped_column(String(5), default="17:00")
    available_days: Mapped[list] = mapped_column(JSON, default=lambda: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
    # [{"skill": "gardening", "level": "expert", "verified": bool, "status": "none|pending|verified", "evidence": url}]
    skills: Mapped[list] = mapped_column(JSON, default=list)
    rating: Mapped[float] = mapped_column(Float, default=0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    jobs_completed: Mapped[int] = mapped_column(Integer, default=0)
    jobs_accepted: Mapped[int] = mapped_column(Integer, default=0)
    on_time_count: Mapped[int] = mapped_column(Integer, default=0)
    cancellations: Mapped[int] = mapped_column(Integer, default=0)
    repeat_customers: Mapped[int] = mapped_column(Integer, default=0)
    avg_response_min: Mapped[float] = mapped_column(Float, default=15)
    upi_id: Mapped[str] = mapped_column(String(80), default="")
    user: Mapped[User] = relationship(back_populates="worker")


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(40), default="other")
    skills: Mapped[list] = mapped_column(JSON, default=list)
    tasks: Mapped[list] = mapped_column(JSON, default=list)  # AI generated checklist
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    address: Mapped[str] = mapped_column(String(200), default="")
    date: Mapped[str] = mapped_column(String(10))  # YYYY-MM-DD
    time_slot: Mapped[str] = mapped_column(String(20), default="flexible")  # morning|afternoon|evening|flexible|asap
    urgent: Mapped[bool] = mapped_column(Boolean, default=False)
    budget: Mapped[int] = mapped_column(Integer, default=0)
    pay_type: Mapped[str] = mapped_column(String(20), default="fixed")  # fixed|per_day|per_hour|per_unit
    duration: Mapped[str] = mapped_column(String(20), default="half_day")  # 1h|2h|3h|half_day|full_day|multi_day
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    workers_required: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)  # open|assigned|in_progress|completed|cancelled
    payment_method: Mapped[str] = mapped_column(String(20), default="cash")  # cash|upi|online
    escrow: Mapped[bool] = mapped_column(Boolean, default=False)
    recurring: Mapped[dict] = mapped_column(JSON, default=dict)  # {"freq": "weekly", "day": "Sun"}
    parent_job_id: Mapped[int] = mapped_column(Integer, default=0)
    preferred_worker_id: Mapped[int] = mapped_column(Integer, default=0)
    flags: Mapped[list] = mapped_column(JSON, default=list)
    fraud_score: Mapped[float] = mapped_column(Float, default=0)
    price_estimate: Mapped[dict] = mapped_column(JSON, default=dict)
    photos: Mapped[list] = mapped_column(JSON, default=list)
    source: Mapped[str] = mapped_column(String(20), default="web")  # web|voice|whatsapp
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Match(Base):
    __tablename__ = "matches"
    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    score: Mapped[float] = mapped_column(Float)
    breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    accept_prob: Mapped[float] = mapped_column(Float, default=0.5)
    status: Mapped[str] = mapped_column(String(20), default="suggested")  # suggested|notified|invited|accepted|declined
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Booking(Base):
    __tablename__ = "bookings"
    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    # confirmed|on_the_way|arrived|completed|paid|cancelled|no_show
    status: Mapped[str] = mapped_column(String(20), default="confirmed")
    amount: Mapped[int] = mapped_column(Integer, default=0)
    travel_started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    start_lat: Mapped[float] = mapped_column(Float, default=0)
    start_lng: Mapped[float] = mapped_column(Float, default=0)
    check_in_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    check_in_lat: Mapped[float] = mapped_column(Float, default=0)
    check_in_lng: Mapped[float] = mapped_column(Float, default=0)
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    before_photos: Mapped[list] = mapped_column(JSON, default=list)
    after_photos: Mapped[list] = mapped_column(JSON, default=list)
    share_token: Mapped[str] = mapped_column(String(32), default="")
    customer_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    reviewed_by_customer: Mapped[bool] = mapped_column(Boolean, default=False)
    reviewed_by_worker: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Payment(Base):
    __tablename__ = "payments"
    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), index=True)
    amount: Mapped[int] = mapped_column(Integer)
    platform_fee: Mapped[int] = mapped_column(Integer)
    worker_amount: Mapped[int] = mapped_column(Integer)
    method: Mapped[str] = mapped_column(String(20), default="cash")
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|held|paid|refunded
    reference: Mapped[str] = mapped_column(String(40), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Review(Base):
    __tablename__ = "reviews"
    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"))
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    reviewee_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), index=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    receiver_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String(20), default="text")  # text|image|location|voice
    text: Mapped[str] = mapped_column(Text, default="")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text, default="")
    kind: Mapped[str] = mapped_column(String(30), default="info")
    link: Mapped[str] = mapped_column(String(200), default="")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Favorite(Base):
    __tablename__ = "favorites"
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("users.id"))


class Dispute(Base):
    __tablename__ = "disputes"
    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"))
    raised_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open|resolved
    resolution: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class WorkerGroup(Base):
    __tablename__ = "worker_groups"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    area: Mapped[str] = mapped_column(String(80))
    skill: Mapped[str] = mapped_column(String(40))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    leader_id: Mapped[int] = mapped_column(Integer, default=0)
    members: Mapped[list] = mapped_column(JSON, default=list)


class SOSAlert(Base):
    __tablename__ = "sos_alerts"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    booking_id: Mapped[int] = mapped_column(Integer, default=0)
    lat: Mapped[float] = mapped_column(Float, default=0)
    lng: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class BusinessRequest(Base):
    __tablename__ = "business_requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, default=0)
    business_name: Mapped[str] = mapped_column(String(120))
    business_type: Mapped[str] = mapped_column(String(40))
    contact_phone: Mapped[str] = mapped_column(String(20))
    need: Mapped[str] = mapped_column(Text)
    workers: Mapped[int] = mapped_column(Integer, default=1)
    frequency: Mapped[str] = mapped_column(String(40), default="weekly")
    status: Mapped[str] = mapped_column(String(20), default="new")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class BotSession(Base):
    __tablename__ = "bot_sessions"
    phone: Mapped[str] = mapped_column(String(20), primary_key=True)
    state: Mapped[dict] = mapped_column(JSON, default=dict)
