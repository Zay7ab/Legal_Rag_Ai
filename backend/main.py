# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Depends
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from routers import chat, search, documents, rights, auth, intake, bookings
from routers.lawyers import router as lawyers_router
from routers.admin import router as admin_router
from db.database import init_db, get_db
from db.seeds import seed_lawyers
from middleware.rate_limiter import RateLimitMiddleware
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# core.config loads .env itself (it must, because routers import it before this
# line ever runs). This call is kept for the modules that read os.getenv directly.
load_dotenv()

from core.config import settings, ConfigError  # noqa: E402
from routers.news import router as news_router  # noqa: E402
from routers.feedback import router as feedback_router  # noqa: E402
from routers.corpus import router as corpus_router      # noqa: E402
from routers.statutes import router as statutes_router  # noqa: E402

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "info").upper(), logging.INFO),
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)



@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[START] legalRag Ai v5 starting up (env=%s)...", settings.env)

    # Fail fast rather than serve traffic with a forgeable JWT secret, a
    # wildcard CORS policy, or no shared rate limiter. Raises in production;
    # warns and substitutes safe defaults in development.
    settings.validate()

    init_db()
    seed_lawyers()

    # Cases/topics are seeded by scripts/seed_db.py, not here — it is a one-off
    # bulk import, not a startup concern. Warn if it was never run, because an
    # empty table makes the whole Case Law page look broken rather than empty.
    try:
        from db.models import Case
        from db.database import SessionLocal
        with SessionLocal() as _db:
            if _db.query(Case).count() == 0:
                logger.warning(
                    "No cases in the database -- Case Law search will return nothing. "
                    "Run: python scripts/seed_db.py"
                )
    except Exception:
        pass

    if not settings.admin_email:
        logger.warning(
            "ADMIN_EMAIL is not set -- no bootstrap admin will be auto-promoted. "
            "Grant admin via: PATCH /api/admin/users/{id}"
        )
    yield
    logger.info("[STOP] legalRag Ai shutting down.")


app = FastAPI(
    title="legalRag Ai API",
    description="AI-powered legal platform for Pakistan",
    version="5.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware ─────────────────────────────────────────────────────────────────
app.add_middleware(
    RateLimitMiddleware,
    calls=settings.rate_limit_calls,
    period=settings.rate_limit_period,
    redis_url=settings.redis_url or None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(chat.router,      prefix="/api/chat",      tags=["Chatbot"])
app.include_router(search.router,    prefix="/api/search",    tags=["Case Search"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(rights.router,    prefix="/api/rights",    tags=["Know Your Rights"])
app.include_router(news_router)
app.include_router(lawyers_router,   prefix="/api/lawyers",   tags=["Lawyers"])
app.include_router(admin_router,     prefix="/api/admin",     tags=["Admin"])
app.include_router(feedback_router,  prefix="/api/feedback",  tags=["Feedback"])
app.include_router(corpus_router,    prefix="/api/corpus",    tags=["Corpus"])
app.include_router(statutes_router,  prefix="/api/statutes",  tags=["Statutes"])
app.include_router(intake.router,    prefix="/api/intake",    tags=["User Biography Intake"])
app.include_router(bookings.router,  prefix="/api/bookings",  tags=["Consultation Requests"])


@app.get("/")
def root():
    return {"message": "legalRag Ai API", "version": "5.0.0", "docs": "/docs"}


@app.get("/health")
def health(db: Session = Depends(get_db)):
    from db.models import Case
    from db.auth_models import User
    index_path = Path("data/faiss_index")
    faiss_ready = index_path.exists() and (index_path / "index.faiss").exists() and (index_path / "index.pkl").exists()
    from services.llm_service import get_groq_api_key
    key = get_groq_api_key()
    groq_set = bool(key and key != "your_groq_api_key_here")
    try:
        cases = db.query(Case).count()
        users = db.query(User).count()
    except Exception:
        cases = users = 0
    return {
        "status": "ok",
        "version": "5.0.0",
        "rag_index_ready": faiss_ready,
        "groq_key_configured": groq_set,
        "db_cases": cases,
        "db_users": users,
    }


@app.get("/api/features")
def get_features_public():
    from routers.admin import _load_features
    return _load_features()


@app.get("/api/rag/status")
def rag_status():
    index_path = Path("data/faiss_index")
    laws_path = Path("data/laws")
    law_files = []
    if laws_path.exists():
        law_files = [
            {"name": f.name, "size_kb": f.stat().st_size // 1024,
             "type": f.suffix.upper().lstrip(".")}
            for f in laws_path.iterdir()
            if f.suffix.lower() in (".pdf", ".txt")
        ]
    index_built = index_path.exists() and (index_path / "index.faiss").exists() and (index_path / "index.pkl").exists()
    return {
        "index_built": index_built,
        "law_files": sorted(law_files, key=lambda x: x["name"]),
        "total_law_files": len(law_files),
    }
