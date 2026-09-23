from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import Base, engine, SessionLocal, UPLOAD_DIR
from . import models  # noqa: F401  (register tables)
from .api_jobs import router as jobs_router
from .api_work import router as work_router
from .api_misc import router as misc_router
from .seed import seed, seed_live
from .matching import train_model

app = FastAPI(title="KaamNear API", description="AI-powered hyperlocal work marketplace", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(jobs_router)
app.include_router(work_router)
app.include_router(misc_router)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.on_event("startup")
def startup():
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        seed(db)
        train_model(db)  # Phase-3 acceptance model learns from match history
        seed_live(db)
    finally:
        db.close()


@app.get("/")
def root():
    return {"name": "KaamNear API", "docs": "/docs"}
