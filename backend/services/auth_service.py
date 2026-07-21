"""
Authentication service — JWT-based auth for Pakistan LegalAI
- Email/password registration & login
- Google OAuth login via Firebase ID token
- JWT access + refresh tokens
- Password hashing with bcrypt
- Role-based access: user, lawyer, admin
"""

from __future__ import annotations

import os
import logging
import random
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict
import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from db.auth_models import User, UserRole, OTPCode

# ── Config ─────────────────────────────────────────────────────────────────────
# All secrets resolve through core.config so there is one place to audit, and so
# a placeholder/blank JWT secret is caught at startup rather than silently
# accepted here. Read lazily: settings.validate() may replace the dev key.
from core.config import settings

ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = settings.refresh_token_expire_days


def _secret() -> str:
    return settings.jwt_secret_key


# Roles a user may ever hold. Anything outside this set is rejected.
VALID_ROLES = {"user", "lawyer", "admin"}
# Roles a client is allowed to ask for at self-registration.
SELF_ASSIGNABLE_ROLES = {"user"}

logger = logging.getLogger(__name__)

# ── Password utils ─────────────────────────────────────────────────────────────
# Uses the `bcrypt` package directly rather than passlib.
#
# Why: `passlib[bcrypt]` was unpinned, and passlib 1.7.4 (2020) reads
# `bcrypt.__about__.__version__`, which bcrypt >= 4.1 removed. A fresh
# `pip install -r requirements.txt` therefore produced a hard crash on every
# register/login. Calling bcrypt directly removes the broken shim entirely.
# Hash format is unchanged ($2b$), so existing stored hashes still verify.

# bcrypt only reads the first 72 bytes and raises on anything longer.
BCRYPT_MAX_BYTES = 72
MAX_PASSWORD_LENGTH = 128   # enforced at registration, well under the 72-byte trap


def _prepare(password: str) -> bytes:
    """Encode and hard-truncate to bcrypt's 72-byte limit."""
    return password.encode("utf-8")[:BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prepare(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not plain or not hashed:
        return False
    try:
        return bcrypt.checkpw(_prepare(plain), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        # Malformed/legacy hash in the DB must not 500 the login endpoint.
        logger.warning("Password verification failed: malformed stored hash")
        return False


# ── Token utils ────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = _utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, _secret(), algorithm=ALGORITHM)


def create_refresh_token(data: Dict) -> str:
    to_encode = data.copy()
    expire = _utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, _secret(), algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[Dict]:
    try:
        return jwt.decode(token, _secret(), algorithms=[ALGORITHM])
    except JWTError:
        return None


# ── Auth service ───────────────────────────────────────────────────────────────

class AuthService:

    # ── Email / password ───────────────────────────────────────────────────────

    def register(self, db: Session, email: str, password: str,
                 full_name: str, role: str = "user") -> Dict:
        if db.query(User).filter(User.email == email.lower()).first():
            raise ValueError("Email already registered.")
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if len(password) > MAX_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at most {MAX_PASSWORD_LENGTH} characters.")

        # SECURITY: `role` arrives from the request body and is fully attacker
        # controlled. Self-registration may only ever produce a plain "user".
        # Elevation to lawyer/admin happens through the admin panel, or via the
        # ADMIN_EMAIL bootstrap below -- never from client input.
        if role and role not in SELF_ASSIGNABLE_ROLES:
            logger.warning(
                "Rejected self-assigned role %r at registration for %s", role, email
            )
        actual_role = "user"

        # Bootstrap: the configured super-admin gets admin on first registration.
        if settings.admin_email and email.lower().strip() == settings.admin_email:
            actual_role = "admin"

        user = User(
            email=email.lower().strip(),
            hashed_password=hash_password(password),
            full_name=full_name.strip(),
            role=actual_role,
            auth_provider="email",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return self._tokens_for(user)

    def login(self, db: Session, email: str, password: str) -> Dict:
        user = db.query(User).filter(User.email == email.lower()).first()
        if not user:
            raise ValueError("Invalid email or password.")
        if user.auth_provider != "email" or not user.hashed_password:
            raise ValueError(
                "This account uses Google Sign-In. Please use the 'Continue with Google' button."
            )
        if not verify_password(password, user.hashed_password):
            raise ValueError("Invalid email or password.")
        if not user.is_active:
            raise ValueError("Account is deactivated. Contact support.")

        # Bootstrap: promote the configured super-admin. Deliberately a promote-
        # only rule -- it never demotes, so admins granted via the panel persist.
        if settings.admin_email and user.email == settings.admin_email and user.role != "admin":
            logger.info("Promoting bootstrap admin %s via ADMIN_EMAIL", user.email)
            user.role = "admin"

        user.last_login = _utcnow()
        db.commit()
        return self._tokens_for(user)

    # ── Google OAuth + OTP 2FA ─────────────────────────────────────────────────

    def google_login_step1(self, db: Session, id_token: str) -> Dict:
        """
        Step 1: Verify Firebase token, find-or-create user, send OTP email.
        Returns {"requires_otp": True, "otp_session": <temp_token>, "email": <masked>}
        """
        from services.firebase_service import verify_google_token
        from services.email_service import send_otp_email

        claims = verify_google_token(id_token)
        email     = claims.get("email", "").lower().strip()
        google_id = claims.get("uid", "")
        full_name = claims.get("name") or email.split("@")[0]

        if not email:
            raise ValueError("Google account has no email address.")

        # Find or prepare user (don't commit yet — wait for OTP verification)
        user = (
            db.query(User).filter(User.google_id == google_id).first()
            or db.query(User).filter(User.email == email).first()
        )
        if user and not user.is_active:
            raise ValueError("Account is deactivated. Contact support.")

        if not user:
            user = User(
                email=email,
                hashed_password=None,
                full_name=full_name,
                role=UserRole.USER,
                auth_provider="google",
                google_id=google_id,
                is_verified=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Generate 6-digit OTP, invalidate old ones for this email
        db.query(OTPCode).filter(
            OTPCode.email == email,
            OTPCode.purpose == "google_2fa",
            OTPCode.used == False,
        ).update({"used": True})
        db.commit()

        code = f"{random.randint(0, 999999):06d}"
        otp_record = OTPCode(
            email=email,
            code=code,
            purpose="google_2fa",
            expires_at=_utcnow() + timedelta(minutes=10),
        )
        db.add(otp_record)
        db.commit()

        # Send OTP email (logs warning if SMTP not configured)
        send_otp_email(email, code, full_name)

        # Issue a short-lived session token carrying only the email (no full JWT yet)
        otp_session = create_access_token(
            {"sub": str(user.id), "email": email, "purpose": "otp_pending"},
            expires_delta=timedelta(minutes=15),
        )

        # Mask email for display: ha***@gmail.com
        parts = email.split("@")
        masked = parts[0][:2] + "***@" + parts[1]

        return {"requires_otp": True, "otp_session": otp_session, "email_hint": masked}

    def google_login_step2(self, db: Session, otp_session: str, code: str) -> Dict:
        """
        Step 2: Verify OTP code and issue full JWT pair.
        """
        payload = decode_token(otp_session)
        if not payload or payload.get("purpose") != "otp_pending":
            raise ValueError("Invalid or expired OTP session.")

        email = payload.get("email", "").lower()
        user_id = int(payload.get("sub", 0))

        # Check OTP
        otp_record = (
            db.query(OTPCode)
            .filter(
                OTPCode.email == email,
                OTPCode.code == code.strip(),
                OTPCode.purpose == "google_2fa",
                OTPCode.used == False,
            )
            .order_by(OTPCode.created_at.desc())
            .first()
        )

        if not otp_record:
            raise ValueError("Incorrect OTP code.")
        if otp_record.expires_at.replace(tzinfo=timezone.utc) < _utcnow():
            raise ValueError("OTP has expired. Please try signing in again.")

        # Mark used
        otp_record.used = True
        db.commit()

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found.")

        # Merge google_id if not yet set (existing email-password account)
        if not user.google_id:
            google_claims = payload.get("google_id")
            if google_claims:
                user.google_id = google_claims
            user.auth_provider = "google"
            user.is_verified = True

        # Bootstrap super-admin promotion (promote-only, see login()).
        if settings.admin_email and user.email == settings.admin_email and user.role != "admin":
            logger.info("Promoting bootstrap admin %s via ADMIN_EMAIL", user.email)
            user.role = "admin"

        user.last_login = _utcnow()
        db.commit()
        db.refresh(user)
        return self._tokens_for(user)

    # ── Token refresh ──────────────────────────────────────────────────────────

    def refresh(self, db: Session, refresh_token: str) -> Dict:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise ValueError("Invalid or expired refresh token.")
        user = db.query(User).filter(User.id == payload.get("sub")).first()
        if not user or not user.is_active:
            raise ValueError("User not found or inactive.")
        return self._tokens_for(user)

    def get_current_user(self, db: Session, token: str) -> Optional[User]:
        """
        Resolve a bearer token to a User. Read-only by design.

        The previous version re-promoted the hardcoded admin here and committed
        on every authenticated request -- a write on the hot path, and a
        role check that belonged in login(). Promotion now happens once, at
        login/registration. This function only reads.
        """
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            return None
        user = db.query(User).filter(User.id == payload.get("sub")).first()
        # A token must stop working the moment an admin deactivates the account.
        if not user or not user.is_active:
            return None
        return user

    # ── Internal ───────────────────────────────────────────────────────────────

    def _tokens_for(self, user: User) -> Dict:
        data = {"sub": str(user.id), "email": user.email, "role": user.role}
        return {
            "access_token":  create_access_token(data),
            "refresh_token": create_refresh_token(data),
            "token_type":    "bearer",
            "user": {
                "id":        user.id,
                "email":     user.email,
                "full_name": user.full_name,
                "role":      user.role,
                "provider":  user.auth_provider,
            },
        }
