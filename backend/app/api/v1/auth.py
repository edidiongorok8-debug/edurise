"""Auth routes: Google sign-in, current profile, sign-out.

Flow: Google verifies identity -> we verify the user exists and has an
ACTIVE school membership -> we issue a server-signed session cookie.
An uninvited Google account can never get past this router.
"""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    SESSION_COOKIE, SESSION_MAX_AGE,
    create_session_token, verify_google_credential,
)
from app.db.session import get_db
from app.models.people import SchoolMembership, User
from app.schemas.api import GoogleCredential, MeOut
from app.services.membership import AuthContext, get_auth, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/google")
def google_signin(
    body: GoogleCredential,
    response: Response,
    db: Session = Depends(get_db),
):
    identity = verify_google_credential(body.credential)

    user = db.scalar(select(User).where(User.google_subject == identity["google_subject"]))
    if user is None:
        # fall back to an invited account with a matching email
        user = db.scalar(select(User).where(User.email == identity["email"]))
        if user is not None:
            user.google_subject = identity["google_subject"]
    if user is None:
        raise HTTPException(
            status_code=403,
            detail="No account for this Google user. Ask your school administrator to invite you.",
        )
    if user.status == "invited":
        user.status = "active"  # first successful Google sign-in activates the account
    elif user.status != "active":
        raise HTTPException(status_code=403, detail="Account is not active.")

    memberships = db.scalars(
        select(SchoolMembership).where(
            SchoolMembership.user_id == user.id,
            SchoolMembership.status == "active",
        )
    ).all()
    if not memberships:
        raise HTTPException(status_code=403, detail="No active school membership.")

    token = create_session_token(
        {"user_id": user.id, "school_id": memberships[0].school_id}
    )
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=SESSION_MAX_AGE,
    )
    user.last_login_at = user.last_login_at  # ORM touch
    db.commit()
    return {"school_id": memberships[0].school_id, "member_schools": len(memberships)}


@router.post("/google/signup")
def google_signup(
    body: GoogleCredential,
    response: Response,
    db: Session = Depends(get_db),
):
    """Sign-up / continue for people registering a school.

    Creates an applicant account (no school membership) if the Google
    identity is new, or signs an existing user in. An applicant session
    can ONLY register a school; it never grants access to any school's data.
    """
    try:
        identity = verify_google_credential(body.credential)
    except Exception:
        raise HTTPException(status_code=400, detail="Google sign-in could not be verified. Please try again.")

    user = db.scalar(select(User).where(User.google_subject == identity["google_subject"]))
    created = False
    if user is None:
        user = db.scalar(select(User).where(User.email == identity["email"]))
        if user is not None:
            user.google_subject = identity["google_subject"]
    if user is None:
        user = User(
            email=identity["email"],
            display_name=identity["display_name"],
            google_subject=identity["google_subject"],
            status="active",
        )
        db.add(user)
        db.flush()
        created = True
    if user.status == "invited":
        user.status = "active"
    elif user.status != "active":
        raise HTTPException(status_code=403, detail="Account is not active.")

    memberships = db.scalars(
        select(SchoolMembership).where(
            SchoolMembership.user_id == user.id,
            SchoolMembership.status == "active",
        )
    ).all()
    school_id = memberships[0].school_id if memberships else None

    token = create_session_token({"user_id": user.id, "school_id": school_id})
    response.set_cookie(
        SESSION_COOKIE, token, httponly=True,
        secure=settings.environment == "production",
        samesite="lax", max_age=SESSION_MAX_AGE,
    )
    db.commit()
    return {
        "email": user.email,
        "display_name": user.display_name,
        "new_account": created,
        "has_school": bool(memberships),
        "school_id": school_id,
    }


@router.get("/applicant")
def applicant_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Who am I, for the registration flow (works with or without a school)."""
    memberships = db.scalars(
        select(SchoolMembership).where(
            SchoolMembership.user_id == user.id,
            SchoolMembership.status == "active",
        )
    ).all()
    return {
        "email": user.email,
        "display_name": user.display_name,
        "has_school": bool(memberships),
        "role": memberships[0].role if memberships else None,
    }


@router.get("/me", response_model=MeOut)
def me(auth: AuthContext = Depends(get_auth)):
    return MeOut(
        id=auth.user.id,
        email=auth.user.email,
        display_name=auth.user.display_name,
        active_school_id=auth.school_id,
        role=auth.role,
    )


@router.post("/signout")
def signout(response: Response):
    response.delete_cookie(SESSION_COOKIE)
    return {"detail": "Signed out."}
