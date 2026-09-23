import math

PLACES = [
    {"name": "Udupi", "lat": 13.3409, "lng": 74.7421},
    {"name": "Manipal", "lat": 13.3525, "lng": 74.7928},
    {"name": "Malpe", "lat": 13.3499, "lng": 74.7033},
    {"name": "Brahmagiri", "lat": 13.3370, "lng": 74.7489},
    {"name": "Kadiyali", "lat": 13.3448, "lng": 74.7546},
    {"name": "Santhekatte", "lat": 13.3125, "lng": 74.7470},
    {"name": "Parkala", "lat": 13.3508, "lng": 74.8390},
    {"name": "Hiriyadka", "lat": 13.3520, "lng": 74.8680},
    {"name": "Katapadi", "lat": 13.2830, "lng": 74.7520},
    {"name": "Kaup", "lat": 13.2290, "lng": 74.7470},
    {"name": "Brahmavar", "lat": 13.4280, "lng": 74.7420},
    {"name": "Kemmannu", "lat": 13.3690, "lng": 74.6990},
    {"name": "Perampalli", "lat": 13.3300, "lng": 74.7720},
    {"name": "Kundapur", "lat": 13.6260, "lng": 74.6900},
]


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def nearest_place(lat, lng) -> str:
    best = min(PLACES, key=lambda p: haversine_km(lat, lng, p["lat"], p["lng"]))
    return best["name"]


def find_place(text: str):
    t = text.lower()
    for p in PLACES:
        if p["name"].lower() in t:
            return p
    return None


def point_to_segment_km(plat, plng, alat, alng, blat, blng) -> tuple[float, float]:
    """Approximate distance (km) from point P to segment AB using an equirectangular projection.
    Returns (distance_km, t) where t in [0,1] is the position along the route."""
    kx = 111.32 * math.cos(math.radians((alat + blat) / 2))
    ky = 110.57
    ax, ay = alng * kx, alat * ky
    bx, by = blng * kx, blat * ky
    px, py = plng * kx, plat * ky
    dx, dy = bx - ax, by - ay
    seg2 = dx * dx + dy * dy
    t = 0.0 if seg2 == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / seg2))
    cx, cy = ax + t * dx, ay + t * dy
    return math.hypot(px - cx, py - cy), t
