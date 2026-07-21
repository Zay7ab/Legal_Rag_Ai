"""
Firebase ID token verifier — no service account required.
Verifies Google Sign-In tokens by fetching Google's public keys directly,
the same way Firebase Admin does internally.
"""

from __future__ import annotations

import logging
import requests
from jose import jwt, JWTError

logger = logging.getLogger(__name__)

_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)
_PROJECT_ID = "legalrag-fyp"


def _get_public_keys() -> dict:
    resp = requests.get(_CERTS_URL, timeout=10)
    resp.raise_for_status()
    return resp.json()


def verify_google_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token using Google's public signing keys.

    Returns decoded claims including:
      uid           — Firebase UID  (mapped from sub / user_id)
      email         — verified Google email
      name          — display name
      picture       — profile photo URL
      email_verified — always True for Google-provider tokens

    Raises ValueError on any verification failure.
    """
    try:
        header = jwt.get_unverified_header(id_token)
        kid = header.get("kid")

        public_keys = _get_public_keys()
        if kid not in public_keys:
            raise ValueError("Firebase token uses an unknown key ID — it may be expired.")

        claims = jwt.decode(
            id_token,
            public_keys[kid],
            algorithms=["RS256"],
            audience=_PROJECT_ID,
            issuer=f"https://securetoken.google.com/{_PROJECT_ID}",
        )

        if not claims.get("email_verified", False):
            raise ValueError("Google account email is not verified.")

        # Firebase puts the UID in 'sub'; normalise to 'uid' for callers
        if "uid" not in claims:
            claims["uid"] = claims.get("user_id") or claims.get("sub", "")

        return claims

    except JWTError as exc:
        raise ValueError(f"Invalid Firebase token: {exc}")
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"Token verification failed: {exc}")
