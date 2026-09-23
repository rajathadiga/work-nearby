"""Demo data for the Udupi / Manipal region so the marketplace feels alive on first run."""
import math
import random
import secrets
from datetime import datetime, date as Date, timedelta

from sqlalchemy.orm import Session

from . import models as m
from .geo import PLACES, nearest_place
from .skills import SKILL_MAP
from .parser import generate_tasks, make_title
from .pricing import base_price, platform_fee

R = random.Random(42)

WORKER_NAMES = ["Ramesh Kumar", "Suresh Poojary", "Mahesh Shetty", "Ravi Naik", "Ganesh Acharya", "Prakash Kotian", "Santosh Moily", "Dinesh Salian",
                "Umesh Devadiga", "Harish Bangera", "Lokesh Karkera", "Nagesh Gowda", "Shankar Nayak", "Vijay Amin", "Manjunath Hegde", "Kiran Suvarna",
                "Sathish Mendon", "Yogesh Kunder", "Praveen D'Souza", "Anand Bhandary", "Lakshmi Poojary", "Sumitra Naik", "Geetha Shetty", "Kamala Devadiga",
                "Savitha Kotian", "Rekha Salian", "Shobha Karkera", "Jayanthi Moily", "Mohan Rao", "Arun Pai", "Rajesh Kamath", "Imran Sheikh",
                "Abdul Rahman", "Joseph Lobo", "Stany Pinto", "Raju Gowda", "Basavaraj Patil", "Mallesh K", "Ashok Kumar", "Sunil Bhat",
                "Deepak Nayak", "Pradeep Shetty", "Chandra Poojary", "Vasanth Kumar", "Ramu Naik"]
CUSTOMER_NAMES = ["Priya Shetty", "Anil Kamath", "Dr. Meera Rao", "Vikram Pai", "Sunita Hegde", "Rohan D'Souza", "Kavya Bhat", "Nitin Acharya",
                  "Hotel Sai Palace", "Green Acres Farm", "Manipal Residency Apartments", "Farida Begum", "George Mathew", "Shalini Nayak",
                  "Karthik Upadhya", "Deepa Rao", "Harsha Shenoy", "Sneha Prabhu", "Coastal Events", "Mahalakshmi Stores"]

# skill bundles workers realistically have
BUNDLES = [
    ["coconut_climbing", "coconut_harvesting", "garden_cleaning", "arecanut_harvesting"],
    ["garden_cleaning", "lawn_mowing", "landscaping", "weeding"],
    ["harvesting", "farm_labour", "weeding", "spraying"],
    ["house_cleaning", "deep_cleaning", "bathroom_cleaning", "house_help"],
    ["plumbing", "water_tank_cleaning", "irrigation_repair"],
    ["electrical", "appliance_repair", "ac_repair"],
    ["loading_unloading", "furniture_moving", "packing", "delivery_helper"],
    ["masonry", "construction_helper", "tiling"],
    ["painting", "construction_helper", "carpentry"],
    ["cooking", "catering", "event_helper"],
    ["event_helper", "decoration", "catering"],
    ["driving", "delivery_helper", "vehicle_mechanic"],
    ["carpentry", "furniture_moving", "roofing"],
    ["elderly_care", "house_help", "baby_sitting"],
    ["welding", "construction_helper"],
    ["computer_basics", "data_entry", "mobile_repair"],
    ["tree_trimming", "coconut_climbing", "garden_cleaning"],
]
LEVELS = ["expert", "advanced", "intermediate", "beginner"]
REVIEW_TEXT = ["Very good work, came on time ", "Hard working and honest", "Neat job, will call again", "Good work but came a bit late",
               "Excellent! Cleaned everything properly", "Polite and skilled", "Did the work quickly", "Very reliable person", "Okay work", "Super, highly recommended"]
REVIEW_TAGS = ["On time", "Skilled", "Polite", "Clean work", "Good value", "Honest"]


def jitter(p, km=2.5):
    d = R.uniform(0.2, km) / 111
    a = R.uniform(0, 2 * math.pi)
    return p["lat"] + d * math.sin(a), p["lng"] + d * math.cos(a) / math.cos(math.radians(p["lat"]))


def seed(db: Session):
    if db.query(m.User).count():
        return
    today = Date.today()
    now = datetime.utcnow()
    near_places = PLACES[:13]

    admin = m.User(name="KaamNear Admin", phone="9999999999", role="admin", area="Udupi", id_status="verified")
    db.add(admin)

    # ---------------- customers
    customers = []
    for i, name in enumerate(CUSTOMER_NAMES):
        p = PLACES[1] if i == 0 else R.choice(near_places)
        lat, lng = (13.3490, 74.7880) if i == 0 else jitter(p)
        c = m.User(name=name, phone=f"98765{i + 1:05d}", role="customer", lat=lat, lng=lng, area=nearest_place(lat, lng),
                   language="en" if i % 3 else "kn", created_at=now - timedelta(days=R.randint(30, 200)),
                   business_name=name if i in (8, 9, 10, 18, 19) else "")
        if i == 0:
            c.trusted_contact_name, c.trusted_contact_phone = "Arjun (husband)", "9845012345"
        db.add(c)
        customers.append(c)

    # ---------------- workers
    workers = []
    for i, name in enumerate(WORKER_NAMES):
        if i == 0:
            lat, lng = 13.3395, 74.7505
            bundle = [("coconut_climbing", "expert", True), ("garden_cleaning", "advanced", True), ("farm_labour", "advanced", False),
                      ("coconut_harvesting", "expert", True), ("carpentry", "intermediate", False)]
        else:
            p = R.choice(near_places)
            lat, lng = jitter(p)
            b = BUNDLES[i % len(BUNDLES)]
            k = R.randint(2, len(b))
            bundle = [(s, R.choices(LEVELS, [3, 4, 3, 1])[0], R.random() < 0.3) for s in b[:k]]
        u = m.User(name=name, phone=f"98765{10001 + i:05d}", role="worker", lat=lat, lng=lng, area=nearest_place(lat, lng),
                   language=R.choice(["kn", "kn", "hi", "en"]) if i else "kn", created_at=now - timedelta(days=R.randint(40, 400)),
                   id_status="verified" if (i == 0 or R.random() < 0.6) else ("pending" if R.random() < 0.3 else "none"),
                   face_status="verified" if (i == 0 or R.random() < 0.4) else "none",
                   subscription="pro" if (i == 0 or R.random() < 0.15) else "free")
        if i == 0:
            u.trusted_contact_name, u.trusted_contact_phone = "Shanthi (wife)", "9845098765"
        db.add(u)
        db.flush()
        top = SKILL_MAP[bundle[0][0]]
        daily = int(top["rate"] * (8 if top["unit"] == "hour" else 1) if top["unit"] in ("day", "hour") else 700)
        daily = max(550, min(1400, daily + R.randint(-80, 120)))
        wp = m.WorkerProfile(
            user=u, user_id=u.id, experience_years=R.randint(1, 15) if i else 12, daily_rate=700 if i == 0 else daily,
            hourly_rate=max(100, daily // 7), radius_km=R.choice([5, 8, 10, 12, 15]) if i else 10,
            available=(i == 0) or R.random() < 0.55, available_days=["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] + (["Sun"] if R.random() < 0.5 else []),
            skills=[{"skill": s, "level": lv, "verified": v, "status": "verified" if v else "none", "evidence": "", "customer_verified": 0} for s, lv, v in bundle],
            bio=("12 years climbing coconut & areca trees. Safety belt and own tools. Also garden & farm work." if i == 0 else
                 f"{R.randint(2, 15)} years experience in {SKILL_MAP[bundle[0][0]]['en'].lower()}. Honest and punctual."),
            upi_id=f"{name.split()[0].lower()}{R.randint(10, 99)}@upi", avg_response_min=R.randint(3, 40))
        db.add(wp)
        workers.append(u)
    db.flush()

    # ---------------- historical completed jobs (last 28 days) with bookings, payments, reviews
    for n in range(170):
        c = R.choice(customers)
        w = workers[0] if n % 6 == 0 else R.choice(workers)
        wp = w.worker
        sk = [s["skill"] for s in wp.skills][:R.randint(1, 2)]
        days_ago = R.randint(1, 28)
        created = now - timedelta(days=days_ago, hours=R.randint(1, 10))
        d = (today - timedelta(days=days_ago))
        duration = R.choice(["2h", "3h", "half_day", "full_day"])
        qty = R.randint(3, 8) if SKILL_MAP[sk[0]]["unit"] == "tree" else 0
        budget = int(round(base_price(sk, duration, qty) * R.uniform(0.9, 1.25) / 10) * 10)
        lat, lng = jitter({"lat": w.lat, "lng": w.lng}, 5)
        j = m.Job(customer_id=c.id, title=make_title(sk, qty), description="", category=SKILL_MAP[sk[0]]["cat"], skills=sk, tasks=generate_tasks(sk),
                  lat=lat, lng=lng, address=nearest_place(lat, lng), date=d.isoformat(), time_slot=R.choice(["morning", "afternoon", "flexible"]),
                  budget=budget, duration=duration, quantity=qty, status="completed", payment_method=R.choice(["cash", "upi", "upi", "online"]),
                  created_at=created)
        db.add(j)
        db.flush()
        start = datetime.combine(d, datetime.min.time()) + timedelta(hours=R.randint(3, 6))
        hrs = {"2h": 2, "3h": 3, "half_day": 4, "full_day": 8}[duration]
        b = m.Booking(job_id=j.id, worker_id=w.id, customer_id=c.id, status="paid", amount=budget, start_lat=w.lat, start_lng=w.lng,
                      travel_started_at=start - timedelta(minutes=20), check_in_at=start, check_out_at=start + timedelta(hours=hrs),
                      check_in_lat=lat, check_in_lng=lng, customer_confirmed=True, reviewed_by_customer=True, reviewed_by_worker=True,
                      share_token=secrets.token_hex(8), created_at=created)
        db.add(b)
        db.flush()
        fee = platform_fee(budget, False, c.subscription)
        db.add(m.Payment(booking_id=b.id, amount=budget + fee, platform_fee=fee, worker_amount=budget, method=j.payment_method, status="paid",
                         reference="UPI" + secrets.token_hex(5).upper(), created_at=start + timedelta(hours=hrs)))
        rating = R.choices([5, 4, 3, 2], [60, 30, 8, 2])[0] if w is not workers[0] else R.choices([5, 4], [80, 20])[0]
        db.add(m.Review(booking_id=b.id, reviewer_id=c.id, reviewee_id=w.id, rating=rating, comment=R.choice(REVIEW_TEXT),
                        tags=R.sample(REVIEW_TAGS, 2), created_at=start + timedelta(hours=hrs + 1)))
        crating = R.choices([5, 4, 3], [70, 25, 5])[0]
        db.add(m.Review(booking_id=b.id, reviewer_id=w.id, reviewee_id=c.id, rating=crating, comment="Good customer, paid on time",
                        tags=["Paid on time"], created_at=start + timedelta(hours=hrs + 1)))
        wp.rating = (wp.rating * wp.rating_count + rating) / (wp.rating_count + 1)
        wp.rating_count += 1
        wp.jobs_completed += 1
        wp.jobs_accepted += 1
        wp.on_time_count += 1 if R.random() < 0.93 else 0
        c.customer_rating = (c.customer_rating * c.customer_rating_count + crating) / (c.customer_rating_count + 1)
        c.customer_rating_count += 1
        c.jobs_posted += 1
        c.payments_completed += 1

        # synthetic match history for the ML acceptance model
        for _ in range(6):
            parts = {"skill": R.randint(30, 100), "distance": R.randint(0, 100), "availability": R.choice([25, 40, 85, 100]),
                     "rating": R.randint(60, 100), "price": R.randint(40, 100), "reliability": R.randint(50, 100), "experience": R.randint(10, 100)}
            km = (100 - parts["distance"]) / 10
            z = -4.2 + 1.6 * parts["skill"] / 100 + 2.2 * parts["distance"] / 100 + 2.4 * parts["availability"] / 100 + 1.3 * parts["price"] / 100 + 0.5 * parts["reliability"] / 100
            accepted = R.random() < 1 / (1 + math.exp(-z * 1.6))
            db.add(m.Match(job_id=j.id, worker_id=R.choice(workers).id, score=0, breakdown={"parts": parts, "distance_km": km},
                           status="accepted" if accepted else "declined", created_at=created))

    # extra flavour for the demo worker
    wp0 = workers[0].worker
    wp0.repeat_customers = 9
    wp0.cancellations = 1
    wp0.jobs_accepted += 1
    for w in workers[1:]:
        if R.random() < 0.2:
            w.worker.cancellations += 1
            w.worker.jobs_accepted += 1
        w.worker.repeat_customers = R.randint(0, max(0, w.worker.jobs_completed // 3))
    db.flush()

    # ---------------- worker groups
    group_defs = [("Udupi Garden & Coconut Workers", "Udupi", "coconut_climbing"), ("Malpe Loading Team", "Malpe", "loading_unloading"),
                  ("Brahmavar Farm Workers", "Brahmavar", "harvesting"), ("Manipal Cleaning Crew", "Manipal", "house_cleaning"),
                  ("Parkala Construction Team", "Parkala", "construction_helper"), ("Coastal Event Helpers", "Udupi", "event_helper")]
    for name, area, skill in group_defs:
        p = next(p for p in PLACES if p["name"] == area)
        cat = SKILL_MAP[skill]["cat"]
        members = [w.id for w in workers if any(SKILL_MAP[s["skill"]]["cat"] == cat for s in w.worker.skills)]
        if skill == "coconut_climbing" and workers[0].id not in members:
            members.insert(0, workers[0].id)
        db.add(m.WorkerGroup(name=name, area=area, skill=skill, lat=p["lat"], lng=p["lng"], leader_id=members[0] if members else 0, members=members[:25]))
    db.commit()
    return customers, workers, admin


def seed_live(db: Session):
    """Open jobs + in-flight bookings that make the demo interesting. Called after seed()."""
    from .matching import run_matching
    from .core import create_booking
    if db.query(m.Job).filter(m.Job.status.in_(["open", "assigned", "in_progress"])).count():
        return
    today = Date.today()
    tmr = today + timedelta(days=1)
    customers = db.query(m.User).filter(m.User.role == "customer").order_by(m.User.id).all()
    workers = db.query(m.User).filter(m.User.role == "worker").order_by(m.User.id).all()
    priya, ramesh = customers[0], workers[0]

    def place(name):
        return next(p for p in PLACES if p["name"] == name)

    open_defs = [
        (1, "Garden cleaning + 3 coconut trees", "Garden is overgrown. Need someone to clean garden and remove coconuts from 3 trees.", ["garden_cleaning", "coconut_harvesting", "coconut_climbing"], "Kadiyali", today.isoformat(), "morning", False, 900, "half_day", 3, 1, {}),
        (2, "Pipe burst in kitchen – URGENT", "Water pipe burst under the kitchen sink, water everywhere!", ["plumbing"], "Brahmagiri", today.isoformat(), "asap", True, 650, "2h", 0, 1, {}),
        (9, "Paddy harvesting – 5 workers", "Need 5 people for paddy harvesting tomorrow 6 AM to 2 PM.", ["harvesting", "farm_labour"], "Brahmavar", tmr.isoformat(), "morning", False, 750, "full_day", 0, 5, {}),
        (3, "Move furniture to 2nd floor", "Need 2 people for 3 hours to move 20 boxes and a sofa.", ["furniture_moving", "loading_unloading"], "Manipal", today.isoformat(), "afternoon", False, 600, "3h", 0, 2, {}),
        (8, "Hotel weekend cleaning", "5 cleaning workers for hotel rooms every Saturday.", ["house_cleaning", "office_cleaning"], "Udupi", (today + timedelta(days=(5 - today.weekday()) % 7 or 7)).isoformat(), "morning", False, 700, "full_day", 0, 5, {"freq": "weekly", "day": "Sat"}),
        (4, "Paint compound wall", "Compound wall painting, about 60 feet, two coats.", ["painting"], "Santhekatte", tmr.isoformat(), "morning", False, 1800, "full_day", 0, 2, {}),
        (5, "Fan and switch repair", "Ceiling fan not working and one switch board sparking.", ["electrical"], "Perampalli", today.isoformat(), "evening", False, 450, "2h", 0, 1, {}),
        (6, "Arecanut harvesting & spraying", "Areca plantation, around 80 trees, harvest and spray.", ["arecanut_harvesting", "spraying"], "Hiriyadka", tmr.isoformat(), "morning", False, 1100, "full_day", 0, 2, {}),
        (18, "Wedding function helpers", "Need 4 helpers for chairs, serving and cleaning at a wedding hall.", ["event_helper", "catering"], "Kaup", tmr.isoformat(), "morning", False, 800, "full_day", 0, 4, {}),
        (19, "Unload rice sacks from lorry", "Lorry with 120 rice bags, need unloading at shop godown.", ["loading_unloading"], "Malpe", today.isoformat(), "afternoon", False, 500, "3h", 0, 3, {}),
        (7, "Elderly care for 3 days", "Need a caretaker for my father for 3 days after surgery.", ["elderly_care"], "Manipal", tmr.isoformat(), "morning", False, 2700, "multi_day", 0, 1, {}),
        (10, "Weekly garden maintenance", "Garden maintenance every Sunday morning.", ["garden_cleaning", "lawn_mowing"], "Katapadi", (today + timedelta(days=(6 - today.weekday()) % 7 or 7)).isoformat(), "morning", False, 600, "half_day", 0, 1, {"freq": "weekly", "day": "Sun"}),
        (11, "Water tank cleaning", "Overhead tank 1000L needs cleaning.", ["water_tank_cleaning"], "Parkala", tmr.isoformat(), "morning", False, 700, "2h", 0, 1, {}),
        (12, "Mason for small wall repair", "Small compound wall repair and plastering.", ["masonry", "construction_helper"], "Kemmannu", tmr.isoformat(), "morning", False, 1200, "full_day", 0, 1, {}),
        (13, "Online form filling help", "Help me fill a government scheme application online.", ["computer_basics"], "Udupi", today.isoformat(), "afternoon", False, 250, "1h", 0, 1, {}),
        (14, "Driver for Mangalore trip", "Need a driver for my car, Udupi to Mangalore and back.", ["driving"], "Udupi", tmr.isoformat(), "morning", False, 1000, "full_day", 0, 1, {}),
        (15, "Coconut plucking – 6 trees", "6 coconut trees near house need plucking.", ["coconut_climbing", "coconut_harvesting"], "Malpe", today.isoformat(), "morning", False, 400, "2h", 6, 1, {}),
        (16, "Deep cleaning before festival", "3 BHK full house deep cleaning.", ["deep_cleaning", "bathroom_cleaning"], "Manipal", tmr.isoformat(), "morning", False, 1500, "full_day", 0, 2, {}),
    ]
    jobs = []
    for ci, title, desc, sk, pl, d, slot, urgent, budget, dur, qty, wr, rec in open_defs:
        c = customers[ci if ci < len(customers) else 0] if ci else priya
        if ci == 1:
            c = priya
        lat, lng = jitter(place(pl), 1.2)
        from .pricing import suggest_price
        price = suggest_price(db, sk, dur, qty, wr, lat, lng, d, urgent)
        j = m.Job(customer_id=c.id, title=title, description=desc, category=SKILL_MAP[sk[0]]["cat"], skills=sk, tasks=generate_tasks(sk),
                  lat=lat, lng=lng, address=pl, date=d, time_slot=slot, urgent=urgent, budget=budget, duration=dur, quantity=qty,
                  workers_required=wr, recurring=rec, price_estimate=price, created_at=datetime.utcnow() - timedelta(minutes=R.randint(5, 600)))
        db.add(j)
        db.flush()
        jobs.append(j)
    # a flagged / scam-looking job for the admin fraud queue
    scam = m.Job(customer_id=customers[14].id, title="Earn ₹5000 daily – registration fee ₹500", description="Pay registration fee to get work. Whatsapp me.",
                 category="other", skills=["loading_unloading"], lat=13.34, lng=74.74, address="Udupi", date=today.isoformat(), budget=5000,
                 duration="full_day", status="cancelled", fraud_score=1.0,
                 flags=["Asks workers to pay money to get work", "Tries to move conversation outside the platform", "Unrealistically high pay (₹5000 vs usual ₹650)"])
    db.add(scam)
    db.commit()
    for j in jobs:
        run_matching(db, j, notify=True)

    # Priya: past job with Ramesh -> he is on the way now (live tracking demo)
    lat, lng = 13.3490, 74.7880
    track_job = m.Job(customer_id=priya.id, title="Coconut harvesting (4 trees)", description="Pluck coconuts from 4 trees behind the house.",
                      category="gardening", skills=["coconut_harvesting", "coconut_climbing"], tasks=generate_tasks(["coconut_harvesting", "coconut_climbing"]),
                      lat=lat, lng=lng, address="Manipal (Eshwar Nagar)", date=today.isoformat(), time_slot="morning", budget=350, duration="2h", quantity=4)
    db.add(track_job)
    db.flush()
    b = create_booking(db, track_job, ramesh, by="customer")
    b.status = "on_the_way"
    b.travel_started_at = datetime.utcnow() - timedelta(minutes=4)
    b.start_lat, b.start_lng = ramesh.lat, ramesh.lng
    track_job.status = "in_progress"
    db.add(m.Message(job_id=track_job.id, sender_id=priya.id, receiver_id=ramesh.id, text="Please bring the safety belt. Gate is open "))
    db.add(m.Message(job_id=track_job.id, sender_id=ramesh.id, receiver_id=priya.id, text="Sari madam, coming in 15 minutes "))

    # Priya: completed job waiting for payment + review
    pj = m.Job(customer_id=priya.id, title="Bathroom & kitchen cleaning", description="", category="cleaning", skills=["bathroom_cleaning", "house_cleaning"],
               tasks=generate_tasks(["bathroom_cleaning", "house_cleaning"]), lat=lat, lng=lng, address="Manipal", date=(today - timedelta(days=1)).isoformat(),
               budget=600, duration="3h", status="in_progress")
    db.add(pj)
    db.flush()
    cleaner = next(w for w in workers if any(s["skill"] == "house_cleaning" for s in w.worker.skills))
    b2 = create_booking(db, pj, cleaner, by="customer")
    b2.status = "completed"
    b2.check_in_at = datetime.utcnow() - timedelta(hours=26)
    b2.check_out_at = datetime.utcnow() - timedelta(hours=23)
    cleaner.worker.jobs_completed += 1
    pj.status = "in_progress"

    # a dispute for the admin
    old = db.query(m.Booking).filter(m.Booking.customer_id == customers[3].id).first()
    if old:
        db.add(m.Dispute(booking_id=old.id, raised_by=customers[3].id, reason="Only half of the painting was done but worker says it is complete."))
    db.add(m.BusinessRequest(business_name="Hotel Sai Palace", business_type="hotel", contact_phone="9876500009", need="5 housekeeping staff every weekend", workers=5, frequency="weekly"))
    db.add(m.Favorite(customer_id=priya.id, worker_id=ramesh.id))
    db.add(m.Favorite(customer_id=priya.id, worker_id=cleaner.id))
    # a pending skill video + pending ID for admin queue
    w5 = workers[5]
    sk = [dict(s) for s in w5.worker.skills]
    if sk:
        sk[0]["status"] = "pending"
        sk[0]["evidence"] = ""
        w5.worker.skills = sk
    db.commit()
