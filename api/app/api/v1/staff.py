"""Staff administration for a school: invite, list, deactivate.

Only a school admin may invite staff. Invited staff activate their
account on first Google sign-in (see api/v1/auth.py).
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.people import SchoolMembership, User
from app.models.tenancy import School
from app.services.membership import AuthContext, require_roles
from app.services.notifications import send_staff_invite

router = APIRouter(prefix="/staff", tags=["staff"])
settings = get_settings()


class StaffInvite(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=120)
    role: str = Field(pattern="^(teacher_staff|manager|editor|publisher)$")


class MemberOut(BaseModel):
    id: int
    email: str
    display_name: str
    role: str
    status: str


@router.get("", response_model=list[MemberOut])
def list_staff(
    auth: AuthContext = Depends(require_roles("school_admin", "manager")),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(User, SchoolMembership)
        .join(SchoolMembership, SchoolMembership.user_id == User.id)
        .where(
            SchoolMembership.school_id == auth.school_id,
            SchoolMembership.status != "revoked",
        )
        .order_by(User.display_name)
    ).all()
    return [
        MemberOut(id=m.id, email=m.email, display_name=m.display_name,
                  role=mem.role, status=m.status)
        for m, mem in rows
    ]


@router.post("/invites", response_model=MemberOut, status_code=201)
def invite_staff(
    body: StaffInvite,
    auth: AuthContext = Depends(require_roles("school_admin")),
    db: Session = Depends(get_db),
):
    school = db.get(School, auth.school_id)

    existing = db.scalar(select(User).where(User.email == body.email))
    already_member = existing and db.scalar(
        select(SchoolMembership).where(
            SchoolMembership.user_id == existing.id,
            SchoolMembership.school_id == auth.school_id,
        )
    )
    if already_member:
        raise HTTPException(status_code=400, detail="This person is already a member.")

    user = existing or User(email=body.email, display_name=body.display_name, status="invited")
    if existing and existing.status == "disabled":
        raise HTTPException(status_code=400, detail="This account is disabled.")
    db.add(user)
    db.flush()

    membership = SchoolMembership(
        school_id=auth.school_id, user_id=user.id, role=body.role, status="active"
    )
    db.add(membership)
    db.commit()

    # idempotent: re-invites cannot duplicate (event_key invite:<school>:<user>)
    send_staff_invite(db, school, user, invite_link=settings.frontend_origin + "/sign-in")
    db.refresh(user)
    return MemberOut(id=user.id, email=user.email, display_name=user.display_name,
                     role=body.role, status=user.status)


@router.post("/{user_id}/revoke", response_model=MemberOut)
def revoke_member(
    user_id: int,
    auth: AuthContext = Depends(require_roles("school_admin")),
    db: Session = Depends(get_db),
):
    if user_id == auth.user.id:
        raise HTTPException(status_code=400, detail="You cannot revoke your own membership.")
    membership = db.scalar(
        select(SchoolMembership).where(
            SchoolMembership.user_id == user_id,
            SchoolMembership.school_id == auth.school_id,
        )
    )
    if not membership or membership.status == "revoked":
        raise HTTPException(status_code=404, detail="Member not found.")
    user = db.get(User, user_id)
    membership.status = "revoked"
    user.status = "disabled"
    db.commit()
    return MemberOut(id=user.id, email=user.email, display_name=user.display_name,
                     role=membership.role, status="revoked")


# ---------------- School profile (about, programmes, image, publish) ----
import base64

from app.models.tenancy import SchoolProfile


class ProfileIn(BaseModel):
    about: str = Field(default="", max_length=3000)
    programmes: str = Field(default="", max_length=3000)
    is_published: bool = False
    image_data: str | None = Field(default=None, max_length=700000)  # data URL


class ProfileOut(BaseModel):
    about: str
    programmes: str
    is_published: bool
    image_data: str | None


def _get_profile(db, school_id) -> SchoolProfile:
    p = db.scalar(select(SchoolProfile).where(SchoolProfile.school_id == school_id))
    if not p:
        p = SchoolProfile(school_id=school_id)
        db.add(p)
        db.flush()
    return p


@router.get("/profile", response_model=ProfileOut)
def get_profile(
    auth: AuthContext = Depends(require_roles("school_admin", "manager", "editor", "publisher")),
    db: Session = Depends(get_db),
):
    p = _get_profile(db, auth.school_id)
    return ProfileOut(about=p.about or "", programmes=p.programmes or "",
                      is_published=p.is_published, image_data=p.image_data)


@router.patch("/profile", response_model=ProfileOut)
def update_profile(
    body: ProfileIn,
    auth: AuthContext = Depends(require_roles("school_admin", "manager", "editor")),
    db: Session = Depends(get_db),
):
    if body.image_data is not None:
        if not body.image_data.startswith("data:image/"):
            raise HTTPException(status_code=400, detail="image must be a data URL")
        # keep payload small: ~500KB decoded max
        if len(body.image_data) > 700_000:
            raise HTTPException(status_code=413, detail="image too large (max ~500KB)")
    p = _get_profile(db, auth.school_id)
    p.about = body.about.strip()
    p.programmes = body.programmes.strip()
    p.is_published = body.is_published
    if body.image_data is not None:
        p.image_data = body.image_data
    db.commit()
    db.refresh(p)
    return ProfileOut(about=p.about or "", programmes=p.programmes or "",
                      is_published=p.is_published, image_data=p.image_data)
