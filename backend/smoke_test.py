"""Quick end-to-end smoke test of the API: python smoke_test.py"""
import time
from fastapi.testclient import TestClient
from app.main import app

t = time.time()
with TestClient(app) as c:
    print("startup", round(time.time() - t, 1), "s")
    H = {"Authorization": "Bearer " + c.post("/api/demo/login/customer").json()["token"]}
    for text in ["Nanage naale belagge garden clean maadbeku mattu 3 coconut mara hatti kayi tegibeku, 2 jana beku Malpe",
                 "कल सुबह 5 मज़दूर चाहिए धान की कटाई के लिए", "ನಾಳೆ ಬೆಳಗ್ಗೆ ತೋಟ ಸ್ವಚ್ಛ ಮಾಡೋಕೆ ಒಬ್ಬರು ಬೇಕು",
                 "Pipe burst urgent plumber needed now", "I need someone for 2 hours to help move 20 boxes"]:
        p = c.post("/api/ai/parse", json={"text": text, "lat": 13.34, "lng": 74.74}).json()
        print("PARSE", {k: p[k] for k in ["skills", "workers_required", "quantity", "date", "time_slot", "urgent", "duration", "title"]}, p["price"]["suggested"])
    jobs = c.get("/api/jobs/mine", headers=H).json()
    for x in jobs[:4]:
        print("JOB", x["id"], x["title"], x["status"], x["match_count"])
    jid = [x for x in jobs if x["status"] == "open"][0]["id"]
    d = c.get(f"/api/jobs/{jid}", headers=H).json()
    for mm in d["matches"][:4]:
        print("MATCH", mm["worker"]["name"], mm["score"], mm["accept_prob"], mm["reasons"][:3])
    r = c.post("/api/jobs", headers=H, json={"description": "Need electrician to fix fan today", "lat": 13.35, "lng": 74.79})
    print("CREATE", r.status_code, r.json()["job"]["title"], r.json()["matches"])
    r = c.post("/api/jobs", headers=H, json={"description": "Pay registration fee 500 to get work", "lat": 13.35, "lng": 74.79})
    print("SCAM", r.status_code, r.json())
    WH = {"Authorization": "Bearer " + c.post("/api/demo/login/worker").json()["token"]}
    f = c.get("/api/worker/feed", headers=WH).json()
    print("FEED", len(f), [(x["title"], x["match"]["score"]) for x in f[:3]])
    print("EARN", c.get("/api/worker/earnings", headers=WH).json()["month"])
    print("ROUTE", len(c.get("/api/worker/route?from_place=Manipal&to_place=Malpe", headers=WH).json()["jobs"]))
    print("INSIGHT", c.get("/api/worker/insights", headers=WH).json()["suggestions"][:2])
    bs = c.get("/api/worker/bookings", headers=WH).json()
    print("WBOOK", [(b["id"], b["status"], b["tracking"]) for b in bs[:2]])
    AH = {"Authorization": "Bearer " + c.post("/api/demo/login/admin").json()["token"]}
    o = c.get("/api/admin/overview", headers=AH).json()
    print("ADMIN", {k: o[k] for k in ["users", "gmv", "revenue", "open_jobs"]}, o["model"])
    print("QUEUES", {k: len(v) for k, v in c.get("/api/admin/queues", headers=AH).json().items()})
    for msg in ["Need gardener tomorrow 9am near Manipal", "ok", "yes"]:
        print("BOT", c.post("/api/bot/message", json={"phone": "9123456789", "text": msg}).json()["replies"][-1][:120].replace("\n", " | "))
    print("BOT", c.post("/api/bot/message", json={"phone": "9123456700", "text": "Nanage ivattu kelsa beku Udupi"}).json()["replies"][0][:200].replace("\n", " | "))
