"""Scam / fraud / abuse detection for job posts and chat messages (rule-based risk scoring)."""
import re

BLOCK_PATTERNS = [
    (r"registration fee|joining fee|deposit (to|for) (get|join)|pay .{0,20}(to get|before) (work|job)|security deposit", "Asks workers to pay money to get work"),
    (r"\botp\b|bank (details|password)|atm pin|cvv|upi pin", "Asks for OTP / bank / PIN details"),
    (r"ಹಣ ಕಟ್ಟಿ ಕೆಲಸ|ನೋಂದಣಿ ಶುಲ್ಕ|पंजीकरण शुल्क|रजिस्ट्रेशन फीस", "Asks workers to pay money to get work"),
]
WARN_PATTERNS = [
    (r"whatsapp me|call me on|contact outside|outside the app|direct payment only", "Tries to move conversation outside the platform"),
    (r"work from home.*earn|earn ₹?\d{4,} (daily|per day)|guaranteed income", "Too-good-to-be-true earning claim"),
    (r"idiot|stupid|bastard|ಮೂರ್ಖ|बेवकूफ", "Abusive language"),
]


def check_text(text: str) -> tuple[list[str], list[str]]:
    t = text.lower()
    blocks = [msg for p, msg in BLOCK_PATTERNS if re.search(p, t)]
    warns = [msg for p, msg in WARN_PATTERNS if re.search(p, t)]
    return blocks, warns


def assess_job(text: str, budget: int, suggested: int, customer_cancellations: int = 0, jobs_last_hour: int = 0) -> dict:
    blocks, warns = check_text(text)
    score = 0.0
    flags = []
    if blocks:
        score += 0.9
        flags += blocks
    if warns:
        score += 0.3 * len(warns)
        flags += warns
    if budget and suggested:
        if budget > suggested * 6:
            score += 0.35
            flags.append(f"Unrealistically high pay (₹{budget} vs usual ₹{suggested})")
        elif budget < suggested * 0.3:
            score += 0.2
            flags.append(f"Pay much lower than local rate (₹{budget} vs usual ₹{suggested})")
    if customer_cancellations >= 3:
        score += 0.2
        flags.append(f"Customer cancelled {customer_cancellations} jobs before")
    if jobs_last_hour >= 5:
        score += 0.3
        flags.append("Many jobs posted in a short time (possible spam)")
    return {"score": round(min(1.0, score), 2), "flags": flags, "blocked": bool(blocks)}
