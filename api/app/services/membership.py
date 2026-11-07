"""Authorization core.

Every protected route resolves the caller's ACTIVE school membership and
filters by school_id. A user from School A touching School B's data must
fail here, regardless of what IDs they pass in the URL.
"""
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import SESSION_COOKIE, read_session_token
from app.db.session import get_db
from app.models.people import SchoolMembership, User
from app.models.tenancy import PlatformRole

MANAGER_ROLES = {"manager", "school_admin"}


@dataclass
class AuthContext:
    user: User
    membership: SchoolMembership
    school_id: int

    @property
    def role(self) -> str:
        return self.membership.role

    @property
    def is_manager(self) -> bool:
        return self.role in MANAGER_ROLES


def _session_payload(request: Request) -> dict:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Not signed in")
    try:
        return read_session_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    payload = _session_payload(request)
    user = db.get(User, payload.get("user_id"))
    if not user or user.status != "active":
        raise HTTPException(status_code=401, detail="Account not active")
    return user


def require_platform_role(*roles: str):
    """Dependency for platform-level users (registration reviewers etc.)."""
    def dep(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        found = db.scalar(
            select(PlatformRole).where(
                PlatformRole.user_id == user.id, PlatformRole.role.in_(roles)
            )
        )
        if not found:
            raise HTTPException(status_code=403, detail="Insufficient platform role")
        return user
    return dep


def get_auth(request: Request, db: Session = Depends(get_db)) -> AuthContext:
    """Resolve user + active membership for the session's school."""
    payload = _session_payload(request)
    user = db.get(User, payload.get("user_id"))
    if not user or user.status != "active":
        raise HTTPException(status_code=401, detail="Account not active")

    school_id = payload.get("school_id")
    membership = None
    if school_id:
        membership = db.scalar(
            select(SchoolMembership).where(
                SchoolMembership.user_id == user.id,
                SchoolMembership.school_id == school_id,
                SchoolMembership.status == "active",
            )
        )
    if not membership:
        # Stale session (signed in before their school was approved, or school
        # changed): adopt their first active membership instead of failing.
        membership = db.scalar(
            select(SchoolMembership).where(
                SchoolMembership.user_id == user.id,
                SchoolMembership.status == "active",
            ).limit(1)
        )
    if not membership:
        raise HTTPException(status_code=403, detail="No active membership for this school")
    return AuthContext(user=user, membership=membership, school_id=membership.school_id)


def require_roles(*roles: str):
    def dep(auth: AuthContext = Depends(get_auth)) -> AuthContext:
        if auth.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return auth
    return dep
