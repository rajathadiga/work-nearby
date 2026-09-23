"""Job understanding: turns free text / voice transcripts (English, Kannada, Hindi, Kanglish, Hinglish)
into a structured job. A fast multilingual rule engine always runs; if ANTHROPIC_API_KEY is set, Claude
refines the result (falls back silently to the rule engine on any error)."""
import json
import os
import re
from datetime import date, timedelta

from .skills import SKILLS, SKILL_MAP, CAT_MAP, TASK_TEMPLATES
from .geo import find_place

NUM_WORDS = {
    # english
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    # kannada (script + roman)
    "ಒಂದು": 1, "ಒಬ್ಬ": 1, "ಒಬ್ಬರು": 1, "ಎರಡು": 2, "ಇಬ್ಬರು": 2, "ಮೂರು": 3, "ಮೂವರು": 3, "ನಾಲ್ಕು": 4, "ನಾಲ್ವರು": 4, "ಐದು": 5, "ಐವರು": 5,
    "ಆರು": 6, "ಏಳು": 7, "ಎಂಟು": 8, "ಒಂಬತ್ತು": 9, "ಹತ್ತು": 10,
    "ondu": 1, "obba": 1, "obbaru": 1, "eradu": 2, "ibbaru": 2, "mooru": 3, "moovaru": 3, "naalku": 4, "aidu": 5, "hattu": 10,
    # hindi (script + roman)
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5, "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
    "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5, "panch": 5, "das": 10,
}
PEOPLE_WORDS = ["worker", "workers", "people", "persons", "person", "men", "labour", "labours", "helpers", "log", "aadmi", "jana", "janaru",
                "ಜನ", "ಜನರು", "ಕೆಲಸಗಾರರು", "ಕೂಲಿಯವರು", "लोग", "मज़दूर", "मजदूर", "आदमी", "जन"]
UNIT_WORDS = ["tree", "trees", "mara", "ಮರ", "ಮರಗಳು", "पेड़", "room", "rooms", "rooms", "ಕೋಣೆ", "कमरे", "box", "boxes", "bags", "sacks"]

TODAY_WORDS = ["today", "ivattu", "ivathu", "indu", "ಇವತ್ತು", "ಇಂದು", "aaj", "आज", "now", "abhi", "ಈಗ", "eega"]
TOMORROW_WORDS = ["tomorrow", "naale", "nale", "ನಾಳೆ", "kal", "कल"]
URGENT_WORDS = ["urgent", "emergency", "asap", "immediately", "right now", "burst", "turant", "jaldi", "ತುರ್ತು", "ಬೇಗ", "bega", "तुरंत", "जल्दी", "अभी"]
MORNING = ["morning", "belagge", "beligge", "ಬೆಳಗ್ಗೆ", "ಬೆಳಿಗ್ಗೆ", "subah", "सुबह"]
AFTERNOON = ["afternoon", "madhyahna", "ಮಧ್ಯಾಹ್ನ", "dopahar", "दोपहर"]
EVENING = ["evening", "sanje", "ಸಂಜೆ", "shaam", "शाम"]
WEEKDAYS = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6,
            "somavara": 0, "bhanuvara": 6, "ಭಾನುವಾರ": 6, "ಶನಿವಾರ": 5, "ಸೋಮವಾರ": 0, "रविवार": 6, "शनिवार": 5, "सोमवार": 0}
RECURRING_WORDS = ["every", "weekly", "each week", "daily", "every day", "pratidina", "ಪ್ರತಿ", "ಪ್ರತಿದಿನ", "हर", "रोज़", "roz", "har"]
DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _norm(text: str) -> str:
    return " " + re.sub(r"[^\wಀ-೿ऀ-ॿ₹ ]+", " ", text.lower()) + " "


def _has(t: str, words) -> bool:
    for w in words:
        wl = w.lower()
        if re.match(r"^[a-z ]+$", wl):
            if re.search(r"(?<![a-z])" + re.escape(wl) + r"(?![a-z])", t):
                return True
        elif wl in t:
            return True
    return False


def detect_skills(text: str) -> list[tuple[str, float]]:
    t = _norm(text)
    scores = {}
    for s in SKILLS:
        hits = 0
        for kw in s["kw"] + [s["en"].lower()]:
            kwl = kw.lower()
            if re.match(r"^[a-z ]+$", kwl):
                if re.search(r"(?<![a-z])" + re.escape(kwl) + r"(?:s|es|ing|er|ers|ed)?(?![a-z])", t):
                    hits += 1 + (0.5 if " " in kwl else 0)
            elif kwl in t:
                hits += 1
        if hits:
            scores[s["id"]] = hits
    ranked = sorted(scores.items(), key=lambda x: -x[1])
    return ranked


def _find_number_before(t: str, words) -> int:
    tokens = t.split()
    for i, tok in enumerate(tokens):
        if any(tok == w or tok.startswith(w) for w in words):
            for j in range(max(0, i - 3), i):
                cand = tokens[j]
                if cand.isdigit():
                    return int(cand)
                if cand in NUM_WORDS:
                    return NUM_WORDS[cand]
    return 0


def parse_job_text(text: str, today: date | None = None) -> dict:
    today = today or date.today()
    t = _norm(text)
    ranked = detect_skills(text)
    top = ranked[0][1] if ranked else 0
    skills = [sid for sid, sc in ranked[:4] if sc >= top * 0.3]
    # generic words ("clean", "tree") shouldn't add an unrelated second skill
    if "garden_cleaning" in skills and "house_cleaning" in skills and not _has(t, ["house", "home", "room", "mane", "ಮನೆ", "घर", "kitchen"]):
        skills.remove("house_cleaning")
    if any(s in skills for s in ("coconut_climbing", "coconut_harvesting")) and "tree_trimming" in skills and not _has(t, ["branch", "branches", "trim", "prune", "ಕೊಂಬೆ", "डाली", "kombe"]):
        skills.remove("tree_trimming")
    # coconut: climbing + harvesting go together
    if "coconut_harvesting" in skills and "coconut_climbing" not in skills:
        skills.append("coconut_climbing")
    if "coconut_climbing" in skills and "coconut_harvesting" not in skills and _has(t, ["coconut", "coconuts", "ತೆಂಗಿನಕಾಯಿ", "ಕಾಯಿ", "नारियल", "kayi"]):
        skills.append("coconut_harvesting")
    category = SKILL_MAP[skills[0]]["cat"] if skills else "other"

    workers = _find_number_before(t, PEOPLE_WORDS) or 1
    if workers > 50:
        workers = 1
    quantity = _find_number_before(t, UNIT_WORDS)

    urgent = _has(t, URGENT_WORDS)
    when = "today" if (urgent or _has(t, TODAY_WORDS)) else ("tomorrow" if _has(t, TOMORROW_WORDS) else "")
    d = today if when == "today" else today + timedelta(days=1) if when == "tomorrow" else None
    recurring = {}
    for wd, idx in WEEKDAYS.items():
        if wd in t:
            if d is None:
                delta = (idx - today.weekday()) % 7 or 7
                d = today + timedelta(days=delta)
            if _has(t, RECURRING_WORDS):
                recurring = {"freq": "weekly", "day": DAY_ABBR[idx]}
    if not recurring and _has(t, ["daily", "every day", "ಪ್ರತಿದಿನ", "रोज़", "roz"]):
        recurring = {"freq": "daily"}

    slot = "asap" if urgent else "morning" if _has(t, MORNING) else "afternoon" if _has(t, AFTERNOON) else "evening" if _has(t, EVENING) else "flexible"
    m = re.search(r"(\d{1,2})\s*(am|pm|baje|ಗಂಟೆ)", t)
    clock = ""
    if m:
        h = int(m.group(1))
        if m.group(2) == "pm" and h < 12:
            h += 12
        clock = f"{h:02d}:00"
        slot = "morning" if h < 12 else "afternoon" if h < 16 else "evening"

    duration = "half_day"
    mh = re.search(r"(\d+)\s*(hour|hours|hr|hrs|ghante|ghanta|ಗಂಟೆ|घंटे|घंटा)", t)
    if mh:
        hrs = int(mh.group(1))
        duration = f"{min(hrs, 8)}h" if hrs <= 3 else ("half_day" if hrs <= 5 else "full_day")
    elif _has(t, ["full day", "whole day", "poora din", "ದಿನಪೂರ್ತಿ", "ಪೂರ್ತಿ ದಿನ", "पूरा दिन"]):
        duration = "full_day"
    elif _has(t, ["days", "week", "ದಿನಗಳು", "दिन"]):
        duration = "multi_day"
    elif skills and SKILL_MAP[skills[0]]["unit"] == "job":
        duration = "2h"

    budget = 0
    mb = re.search(r"(?:₹|rs\.?|rupees|inr)\s*(\d{2,6})|(\d{2,6})\s*(?:₹|rs|rupees|rupaye|ರೂಪಾಯಿ|रुपये|रुपए)", t)
    if mb:
        budget = int(mb.group(1) or mb.group(2))

    place = find_place(text)
    title = make_title(skills, quantity, workers)
    return {
        "category": category,
        "skills": skills,
        "workers_required": workers,
        "quantity": quantity,
        "duration": duration,
        "date": d.isoformat() if d else "",
        "time_slot": slot,
        "clock": clock,
        "urgent": urgent,
        "recurring": recurring,
        "budget": budget,
        "place": place["name"] if place else "",
        "title": title,
        "tasks": generate_tasks(skills),
        "engine": "rules",
        "confidence": round(min(1.0, (ranked[0][1] / 3) if ranked else 0.1), 2),
    }


def make_title(skills, quantity=0, workers=1) -> str:
    if not skills:
        return "Local help needed"
    names = [SKILL_MAP[s]["en"] for s in skills[:2]]
    title = " + ".join(names)
    if quantity and SKILL_MAP[skills[0]]["unit"] == "tree":
        title += f" ({quantity} trees)"
    if workers > 1:
        title += f" – {workers} workers"
    return title


def generate_tasks(skills) -> list[str]:
    tasks = []
    for s in skills[:3]:
        for tsk in TASK_TEMPLATES.get(s, []):
            if tsk not in tasks:
                tasks.append(tsk)
    return tasks[:7]


def parse_availability_text(text: str) -> dict:
    """Worker voice: 'I am available today within 10 km' -> {available, radius_km, date}"""
    t = _norm(text)
    out = {"available": True}
    m = re.search(r"(\d{1,3})\s*(km|kilometer|kilometre|ಕಿಲೋಮೀಟರ್|किलोमीटर|ಕಿಮೀ)", t)
    if m:
        out["radius_km"] = int(m.group(1))
    if _has(t, ["not available", "busy", "no work", "ಬೇಡ", "ಇಲ್ಲ", "नहीं", "illa", "nahi"]):
        out["available"] = False
    out["when"] = "tomorrow" if _has(t, TOMORROW_WORDS) else "today"
    out["skills"] = [sid for sid, _ in detect_skills(text)[:4]]
    return out


# ---------------------------------------------------------------- optional Claude refinement
_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {"type": "string", "enum": [c for c in CAT_MAP]},
        "skills": {"type": "array", "items": {"type": "string", "enum": [s["id"] for s in SKILLS]}},
        "workers_required": {"type": "integer"},
        "quantity": {"type": "integer"},
        "duration": {"type": "string", "enum": ["1h", "2h", "3h", "half_day", "full_day", "multi_day"]},
        "urgent": {"type": "boolean"},
        "title": {"type": "string"},
        "tasks": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["category", "skills", "workers_required", "quantity", "duration", "urgent", "title", "tasks"],
    "additionalProperties": False,
}


def llm_refine(text: str, base: dict) -> dict:
    if not os.getenv("ANTHROPIC_API_KEY"):
        return base
    try:
        import anthropic

        client = anthropic.Anthropic(timeout=20.0, max_retries=1)
        prompt = (
            "A person in Udupi, India posted a local work request (may be English, Kannada, Hindi, or mixed/romanised). "
            "Extract the structured job. Use only skill ids from the schema enum. The title should be short, in English. "
            "Tasks: 3-6 short checklist items a worker would do.\n\nRequest: " + text
        )
        resp = client.beta.messages.create(
            model="claude-opus-5",
            max_tokens=2000,
            output_config={"effort": "low", "format": {"type": "json_schema", "schema": _SCHEMA}},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            messages=[{"role": "user", "content": prompt}],
        )
        if resp.stop_reason != "end_turn":
            return base
        txt = next((b.text for b in resp.content if b.type == "text"), "")
        data = json.loads(txt)
        merged = dict(base)
        for k in ["category", "skills", "workers_required", "quantity", "duration", "title", "tasks"]:
            if data.get(k):
                merged[k] = data[k]
        merged["urgent"] = base["urgent"] or data.get("urgent", False)
        merged["engine"] = "claude"
        merged["confidence"] = 0.95
        return merged
    except Exception:
        return base


def understand(text: str) -> dict:
    return llm_refine(text, parse_job_text(text))
