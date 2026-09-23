"""Price suggestion: base local rate x duration x urgency x weekend x live supply/demand, with transparent reasons."""
from datetime import date as Date
from sqlalchemy.orm import Session

from .skills import SKILL_MAP
from .geo import haversine_km
from . import models as m

DURATION_HOURS = {"1h": 1, "2h": 2, "3h": 3, "half_day": 4, "full_day": 8, "multi_day": 16}


def base_price(skills: list[str], duration: str, quantity: int = 0) -> int:
    if not skills:
        return 600
    hours = DURATION_HOURS.get(duration, 4)
    total = 0
    for i, sid in enumerate(skills[:2]):
        s = SKILL_MAP.get(sid)
        if not s:
            continue
        unit, rate = s["unit"], s["rate"]
        if unit == "day":
            p = rate * (hours / 8 if hours < 8 else hours / 8)
            p = max(p, rate * 0.6)
        elif unit == "hour":
            p = rate * hours
        elif unit == "tree":
            p = rate * max(quantity, 3)
        else:  # job
            p = rate + (hours - 2) * 60 if hours > 2 else rate
        total += p if i == 0 else p * 0.35  # secondary skill adds a little
    return int(round(total / 10) * 10)


def supply_demand(db: Session, lat: float, lng: float, skills: list[str], radius=10.0) -> tuple[int, int]:
    open_jobs = db.query(m.Job).filter(m.Job.status == "open").all()
    demand = sum(1 for j in open_jobs if haversine_km(lat, lng, j.lat, j.lng) <= radius and set(j.skills) & set(skills))
    workers = db.query(m.WorkerProfile).filter(m.WorkerProfile.available == True).all()  # noqa: E712
    supply = 0
    for w in workers:
        if haversine_km(lat, lng, w.user.lat, w.user.lng) <= radius and any(s["skill"] in skills for s in w.skills):
            supply += 1
    return demand, supply


def suggest_price(db: Session, skills, duration, quantity, workers_required, lat, lng, date_str="", urgent=False) -> dict:
    base = base_price(skills, duration, quantity)
    reasons = [f"Typical local rate for this work: ₹{base}"]
    mult = 1.0
    if urgent:
        mult *= 1.3
        reasons.append("Urgent work (+30%)")
    try:
        d = Date.fromisoformat(date_str) if date_str else Date.today()
        if d.weekday() >= 5:
            mult *= 1.1
            reasons.append("Weekend (+10%)")
    except ValueError:
        pass
    demand, supply = supply_demand(db, lat, lng, skills)
    ratio = (demand + 1) / (supply + 1)
    if ratio > 1.5:
        f = min(1.25, 1 + (ratio - 1.5) * 0.1 + 0.08)
        mult *= f
        reasons.append(f"High demand: {demand} similar jobs, only {supply} workers free nearby (+{int((f-1)*100)}%)")
    elif ratio < 0.5:
        mult *= 0.95
        reasons.append(f"Many workers free nearby ({supply}) (-5%)")
    else:
        reasons.append(f"Normal demand ({demand} jobs, {supply} workers nearby)")
    per_worker = base * mult
    low = int(round(per_worker * 0.9 / 10) * 10)
    high = int(round(per_worker * 1.25 / 10) * 10)
    mid = int(round(per_worker / 10) * 10)
    if workers_required > 1:
        reasons.append(f"Price is per worker × {workers_required} workers")
    return {"low": low, "high": high, "suggested": mid, "per_worker": True, "workers": workers_required,
            "total_suggested": mid * workers_required, "reasons": reasons, "demand": demand, "supply": supply}


def platform_fee(amount: int, urgent: bool, subscription: str) -> int:
    rate = 0.05
    if urgent:
        rate = 0.08
    if subscription == "homecare":
        rate = rate / 2
    return max(10, int(round(amount * rate)))
