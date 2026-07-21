# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Depends, Header
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, EmailStr
from typing import Optional
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from db.database import get_db
from services.auth_service import AuthService

router = APIRouter()
auth_service = AuthService()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    # NOTE: `role` is deliberately NOT accepted here. It was previously
    # client-supplied, which let anyone self-assign a privileged role.
    # Roles are granted via the admin panel (PATCH /api/admin/users/{id}).


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class GoogleLoginRequest(BaseModel):
    id_token: str

class GoogleOTPRequest(BaseModel):
    otp_session: str
    code: str


# ── Dependency: get current user from Bearer token ─────────────────────────────
def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    user = auth_service.get_current_user(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Returns user if token present, None otherwise (for optional auth)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    return auth_service.get_current_user(db, token)


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    try:
        return auth_service.register(db, req.email, req.password, req.full_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    try:
        return auth_service.login(db, req.email, req.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/google")
def google_login_step1(req: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        return auth_service.google_login_step1(db, req.id_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/google/verify-otp")
def google_login_step2(req: GoogleOTPRequest, db: Session = Depends(get_db)):
    try:
        return auth_service.google_login_step2(db, req.otp_session, req.code)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/refresh")
def refresh(req: RefreshRequest, db: Session = Depends(get_db)):
    try:
        return auth_service.refresh(db, req.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat(),
    }
