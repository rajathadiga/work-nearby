# 🤝 KaamNear — Work nearby. Earn daily.

**An AI-powered hyperlocal labour marketplace that matches short-duration jobs with nearby available workers using skill, location, availability, reliability and historical completion data.**

Built for the Udupi / Manipal region first, with a voice-first, pictorial UI in **ಕನ್ನಡ, हिन्दी and English** so that people who don't read or type much can still use it.

---

## ✨ Features

| Area | What's built |
|---|---|
| **Customers** | 30-second job posting wizard, voice input (kn-IN / hi-IN / en-IN), AI job understanding, AI job-description checklist, map pin / current location, ASAP / today / tomorrow / date + time slot, duration, workers needed, tree count, recurring weekly jobs, price suggestion with reasons, cash / UPI / online escrow |
| **Matching engine** | Weighted score (skill 35, distance 20, availability 15, experience 10, rating 10, price 5, reliability 5) · semantic skill similarity (TF-IDF over multilingual skill vocab + related-skill graph) · **logistic-regression acceptance model** trained on past accept/decline history · “why this worker” explanations · top workers auto-alerted, Pro workers first |
| **Workers** | Giant “Available today” toggle, voice availability (“available today 10 km”), radius, nearby-work feed (list + map), accept / decline, invitations, **jobs along my route**, worker groups, earnings dashboard (30-day chart, by skill, hours, pending), **Digital Work Passport**, skill levels, skill-video verification, skills-in-demand + AI skill suggestions + growth path |
| **Job lifecycle** | Hire / invite / accept → on the way (live tracking + ETA) → check-in → before/after photos → check-out → customer confirms → pay (cash / UPI deep link / online / escrow release) + tip → two-way reviews |
| **Trust & safety** | Verification levels (phone → ID → trusted), ID / selfie / address upload, reliability score (completion, on-time, cancellations, repeat customers), customer reputation, SOS (112 + trusted contact + admin alert), share-live-trip link for family, safety tips for risky skills, **work guarantee** (no-show → auto replacement alerts), disputes with evidence |
| **AI / fraud** | Multilingual rule-based parser (English, Kannada, Hindi, Kanglish, Hinglish) + optional **Claude** refinement, scam detection (registration fees, OTP/bank requests, unrealistic pay, spam bursts, off-platform contact), chat message screening |
| **Growth** | Chat (text, photo, location, voice-to-text, quick replies), favourites + book again, recurring jobs auto-invite the same worker, Worker Pro ₹99 & HomeCare Pass ₹199 plans, B2B enquiries, **WhatsApp bot** (post jobs / find work by message), demand heatmap, local work intelligence |
| **Admin** | GMV, revenue, escrow, users, jobs, charts, live map of workers & jobs, dispute resolution (release / refund), ID & skill-video verification queues, fraud queue, SOS, business leads, user blocking, ML model weights + retrain |
| **Accessibility** | Language switch everywhere, 🔊 read-aloud on every screen/card, auto-read alerts, big tap targets & number keypad login, emoji pictograms, colour-coded status |

## 🧱 Tech stack

- **Frontend:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion · Leaflet + OpenStreetMap · Recharts · Web Speech API
- **Backend:** FastAPI · SQLAlchemy · SQLite (swap `DATABASE_URL` for PostgreSQL + PostGIS) · pure-Python matching / ML
- **Optional LLM:** set `ANTHROPIC_API_KEY` to let Claude refine job understanding

## 🚀 Run locally

```bash
# 1. Backend  (http://localhost:8000, docs at /docs)
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (source .venv/bin/activate on mac/linux)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. Frontend (http://localhost:3000)
cd frontend
npm install
npm run dev
```

The database is created and seeded automatically on first start (45 workers, 20 customers, 170 past jobs, live open jobs, a worker on the way, a dispute, etc.). Delete `backend/kaamnear.db` to reset.

### Demo logins
- Landing page → **Try demo quickly** (one tap), or
- Log in with any 10-digit phone number — OTP is **1234**
  - Customer Priya: `9876500001` · Worker Ramesh: `9876510001` · Admin: `9999999999`

## 🗺️ Roadmap to production
Real SMS OTP, UPI/escrow gateway, WhatsApp Business API webhook, FCM push, PostGIS + pgvector embeddings (sentence-transformers), Celery/Redis queues, and more matching signals as real usage data comes in.
