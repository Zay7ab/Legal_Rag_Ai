# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Body
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import Optional
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from db.database import get_db
from db.auth_models import User
from db.models import Case, Lawyer, UserChatHistory
from routers.auth import get_current_user
from pathlib import Path
import json, shutil, logging

logger = logging.getLogger(__name__)
router = APIRouter()

FEATURES_FILE = Path("data/features.json")
LAWS_DIR = Path("data/laws")

DEFAULT_FEATURES: dict = {
    "chat": True, "search": False, "docs": True, "rights": True,
    "faq": True, "glossary": True, "penalty": True, "finder": True,
    "scanner": True, "booking": True, "casetrack": True, "news": True,
    "registration": True, "google_auth": True,
}
# search=False by default, deliberately.
#
# The case database shipped with 21 fabricated judgments -- "XYZ Corporation vs
# Labour Tribunal", "State vs Accused", "Tenant vs Landlord", "2021 SCMR 1234".
# They have been deleted (see scripts/seed_db.py). With no real source, Case Law
# has nothing to search, and an empty result for every query reads as broken.
#
# Turn this on once real judgments are loaded from an actual source:
#   https://www.supremecourt.gov.pk/downloads_judgements/   (official, free)
#   https://caselaw.shc.gov.pk                              (Sindh HC, official)
# Verified citation + verified party names + a summary derived from the judgment
# text. Not from a model's recollection.


def _load_features() -> dict:
    if FEATURES_FILE.exists():
        return {**DEFAULT_FEATURES, **json.loads(FEATURES_FILE.read_text())}
    return DEFAULT_FEATURES.copy()


def _save_features(features: dict) -> None:
    FEATURES_FILE.parent.mkdir(parents=True, exist_ok=True)
    FEATURES_FILE.write_text(json.dumps(features, indent=2))


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Authorise on role alone.

    The email check that used to live here was load-bearing only because
    /api/auth/register accepted a client-supplied `role`. That hole is now
    closed (see services/auth_service.py: SELF_ASSIGNABLE_ROLES), so the
    role column is the single source of truth and admins can be granted
    through the panel without editing source.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


# ── Safe path handling ─────────────────────────────────────────────────────────
MAX_LAW_FILE_BYTES = 25 * 1024 * 1024   # 25 MB
ALLOWED_LAW_SUFFIXES = (".pdf", ".txt")


def _safe_law_path(filename: str) -> Path:
    """
    Resolve `filename` strictly inside LAWS_DIR.

    Both upload and delete previously did `LAWS_DIR / filename` with a
    client-supplied name, so "../../../etc/cron.d/x.txt" escaped the directory:
    arbitrary file write on upload and arbitrary file delete on delete. These
    are admin-only routes, but before the registration fix anyone could become
    an admin -- which made this a straight path to RCE.

    Strategy: strip every directory component, then verify the resolved path is
    genuinely a child of LAWS_DIR (defends against symlinks and odd encodings).
    """
    if not filename or filename in (".", ".."):
        raise HTTPException(status_code=400, detail="Invalid filename.")

    # Reject backslashes explicitly: PurePosixPath.name does NOT treat "\\" as a
    # separator, so "..\\..\\evil.txt" would survive intact here and then traverse
    # if the backend ever runs on Windows (this repo ships .bat start scripts).
    if "\\" in filename or "\x00" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    # Discard any path component the client supplied: "a/../../b.txt" -> "b.txt"
    clean = Path(filename).name
    if not clean or clean.startswith("."):
        raise HTTPException(status_code=400, detail="Invalid filename.")
    if not clean.lower().endswith(ALLOWED_LAW_SUFFIXES):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files allowed.")

    base = LAWS_DIR.resolve()
    target = (base / clean).resolve()
    if target.parent != base:
        logger.warning("Blocked path traversal attempt: %r", filename)
        raise HTTPException(status_code=400, detail="Invalid filename.")
    return target


# ── Stats ──────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    law_files = (list(LAWS_DIR.glob("**/*.pdf")) + list(LAWS_DIR.glob("**/*.txt"))) if LAWS_DIR.exists() else []
    return {
        "users_total":   db.query(User).count(),
        "users_active":  db.query(User).filter(User.is_active == True).count(),
        "google_users":  db.query(User).filter(User.auth_provider == "google").count(),
        "lawyers_total": db.query(Lawyer).count(),
        "cases_total":   db.query(Case).count(),
        "law_files":     len(law_files),
        "rag_ready":     Path("data/faiss_index").exists(),
    }


# ── Users ──────────────────────────────────────────────────────────────────────

class UpdateUserRequest(BaseModel):
    role:      Optional[str]  = None
    is_active: Optional[bool] = None


@router.get("/users")
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return [
        {
            "id": u.id, "email": u.email, "full_name": u.full_name,
            "role": u.role, "is_active": u.is_active, "is_verified": u.is_verified,
            "auth_provider": u.auth_provider,
            "last_login":  u.last_login.isoformat() if u.last_login else None,
            "created_at":  u.created_at.isoformat(),
        }
        for u in db.query(User).order_by(User.created_at.desc()).all()
    ]


@router.put("/users/{user_id}")
def update_user(user_id: int, req: UpdateUserRequest, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own account.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if req.role is not None:
        if req.role not in ("user", "lawyer", "admin"):
            raise HTTPException(status_code=400, detail="Invalid role.")
        user.role = req.role
    if req.is_active is not None:
        user.is_active = req.is_active
    db.commit()
    return {"ok": True}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    db.delete(user)
    db.commit()
    return {"ok": True}


class CreateUserRequest(BaseModel):
    email:     str
    password:  str
    full_name: str
    role:      str = "user"


@router.post("/users")
def create_user(req: CreateUserRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    from services.auth_service import hash_password
    from db.auth_models import User as DBUser
    
    if db.query(DBUser).filter(DBUser.email == req.email.lower().strip()).first():
        raise HTTPException(status_code=400, detail="Email already registered.")
        
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
        
    if req.role not in ("user", "lawyer", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role.")
        
    user = DBUser(
        email=req.email.lower().strip(),
        hashed_password=hash_password(req.password),
        full_name=req.full_name.strip(),
        role=req.role,
        auth_provider="email",
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "id": user.id, "email": user.email, "full_name": user.full_name,
        "role": user.role, "is_active": user.is_active, "is_verified": user.is_verified,
        "auth_provider": user.auth_provider, "created_at": user.created_at.isoformat()
    }


@router.get("/users/{user_id}/history")
def get_user_chat_history(user_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    history = db.query(UserChatHistory).filter(UserChatHistory.user_id == user_id).order_by(UserChatHistory.created_at.desc()).all()
    sessions_dict = {}
    for h in history:
        sid = h.session_id
        if sid not in sessions_dict:
            sessions_dict[sid] = {
                "session_id": sid,
                "session_title": h.session_title,
                "messages": []
            }
        sessions_dict[sid]["messages"].append({
            "id": h.id,
            "role": h.role,
            "content": h.content,
            "created_at": h.created_at.isoformat()
        })
    for sid in sessions_dict:
        sessions_dict[sid]["messages"].reverse()
    return list(sessions_dict.values())


# ── Lawyers ────────────────────────────────────────────────────────────────────

class LawyerRequest(BaseModel):
    name:      str
    city:      str
    area:      str
    exp:       int   = 0
    rating:    float = 4.0
    verified:  bool  = False
    languages: str   = "Urdu"
    fee:       str   = ""
    courts:    str   = ""
    edu:       str   = ""
    about:     str   = ""
    phone:     str   = ""
    whatsapp:  str   = ""
    email:     str   = ""
    chamber:   str   = ""
    is_active: bool  = True


@router.get("/lawyers")
def list_all_lawyers(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return [l.to_dict() for l in db.query(Lawyer).order_by(Lawyer.name).all()]


@router.post("/lawyers")
def add_lawyer(req: LawyerRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    lawyer = Lawyer(**req.model_dump())
    db.add(lawyer)
    db.commit()
    db.refresh(lawyer)
    return lawyer.to_dict()


@router.put("/lawyers/{lawyer_id}")
def update_lawyer(lawyer_id: int, req: LawyerRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    lawyer = db.query(Lawyer).filter(Lawyer.id == lawyer_id).first()
    if not lawyer:
        raise HTTPException(status_code=404, detail="Lawyer not found.")
    for k, v in req.model_dump().items():
        setattr(lawyer, k, v)
    db.commit()
    return lawyer.to_dict()


@router.delete("/lawyers/{lawyer_id}")
def delete_lawyer(lawyer_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    lawyer = db.query(Lawyer).filter(Lawyer.id == lawyer_id).first()
    if not lawyer:
        raise HTTPException(status_code=404, detail="Lawyer not found.")
    db.delete(lawyer)
    db.commit()
    return {"ok": True}


# ── Laws / RAG ─────────────────────────────────────────────────────────────────

@router.get("/laws")
def list_laws(_: User = Depends(require_admin)):
    LAWS_DIR.mkdir(parents=True, exist_ok=True)
    files = [
        {"name": f.name, "size_kb": f.stat().st_size // 1024, "type": f.suffix.upper().lstrip(".")}
        for f in LAWS_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in (".pdf", ".txt")
    ]
    return sorted(files, key=lambda x: x["name"])


@router.post("/laws/upload")
async def upload_law(file: UploadFile = File(...), _: User = Depends(require_admin)):
    LAWS_DIR.mkdir(parents=True, exist_ok=True)
    dest = _safe_law_path(file.filename)

    # Stream with a hard cap. The old shutil.copyfileobj was unbounded, so a
    # single request could fill the disk.
    written = 0
    try:
        with dest.open("wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                written += len(chunk)
                if written > MAX_LAW_FILE_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large (max {MAX_LAW_FILE_BYTES // (1024*1024)} MB).",
                    )
                out.write(chunk)
    except HTTPException:
        dest.unlink(missing_ok=True)   # don't leave a truncated file behind
        raise
    except Exception as exc:
        dest.unlink(missing_ok=True)
        logger.exception("Law upload failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}")

    logger.info("Law file uploaded: %s (%d bytes)", dest.name, written)
    return {"ok": True, "name": dest.name, "size_kb": written // 1024}


@router.delete("/laws/{filename}")
def delete_law(filename: str, _: User = Depends(require_admin)):
    target = _safe_law_path(filename)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found.")
    target.unlink()
    logger.info("Law file deleted: %s", target.name)
    return {"ok": True}


@router.post("/laws/reindex")
def reindex_laws(_: User = Depends(require_admin)):
    try:
        from services.rag_service import RAGService
        summary = RAGService().ingest_documents()
        return {"ok": True, "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Features ───────────────────────────────────────────────────────────────────

@router.get("/features")
def get_features(_: User = Depends(require_admin)):
    return _load_features()


@router.put("/features")
def update_features(body: dict = Body(...), _: User = Depends(require_admin)):
    current = _load_features()
    for k, v in body.items():
        if k in DEFAULT_FEATURES:
            current[k] = bool(v)
    _save_features(current)
    return current


# ── Configuration Management ───────────────────────────────────────────────────

CONFIG_FILE = Path("data/config.json")


def _load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text())
        except Exception:
            pass
    return {}


def _save_config(config: dict) -> None:
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(config, indent=2))


@router.get("/config")
def get_config(_: User = Depends(require_admin)):
    from services.llm_service import get_groq_api_key
    key = get_groq_api_key()
    
    masked_key = ""
    if key and key.strip() != "your_groq_api_key_here":
        key_str = key.strip()
        if len(key_str) > 8:
            masked_key = f"{key_str[:6]}...{key_str[-4:]}"
        else:
            masked_key = "Configured"
            
    return {
        "GROQ_API_KEY": masked_key,
        "is_configured": bool(key and key.strip() != "your_groq_api_key_here")
    }


@router.post("/config")
def update_config(body: dict = Body(...), _: User = Depends(require_admin)):
    new_key = body.get("GROQ_API_KEY", "").strip()
    
    if not new_key:
        raise HTTPException(status_code=400, detail="API Key cannot be empty.")
        
    if "..." in new_key or new_key == "Configured":
        return {"ok": True, "message": "No change detected."}
        
    config = _load_config()
    config["GROQ_API_KEY"] = new_key
    _save_config(config)
    
    from services.llm_service import reset_client
    reset_client()
    
    return {"ok": True, "message": "API Key updated successfully."}
