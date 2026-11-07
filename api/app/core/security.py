"""Google OAuth verification and session token helpers.

Google login is AUTHENTICATION only. Authorization always comes from
school_memberships (see services/membership.py).
"""
import jwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.core.config import get_settings

SESSION_COOKIE = "scp_session"
SESSION_MAX_AGE = 8 * 3600  # 8 hours


def verify_google_credential(credential: str) -> dict:
    """Verify a Google ID token and return the stable identity fields."""
    info = id_token.verify_oauth2_token(
        credential, google_requests.Request(), get_settings().google_client_id
    )
    if not info.get("email_verified", False):
        raise ValueError("Google account email is not verified")
    return {
        "google_subject": info["sub"],
        "email": info["email"],
        "display_name": info.get("name") or info["email"],
    }


def create_session_token(payload: dict) -> str:
    return jwt.encode(payload, get_settings().session_secret, algorithm="HS256")


def read_session_token(token: str) -> dict:
    return jwt.decode(token, get_settings().session_secret, algorithms=["HS256"])
