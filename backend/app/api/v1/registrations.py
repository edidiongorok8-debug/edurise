"""School registration: public request, platform-reviewer approval.

Approval creates the tenant: school + profile + school_admin membership
for the registrant. Nothing in the private workspace exists until this
verification step passes.
"""
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.people import SchoolMembership, User
from app.models.tenancy import (
    School, SchoolProfile, SchoolRegistrationRequest, Zone,
)
from app.schemas.api import (
    RegistrationCreate, RegistrationOut, ReviewDecision,
    RegistrationMineIn, RegistrationMineOut, MyRegistrationOut,
)
from app.services.membership import get_current_user, require_platform_role
from app.services.email import send_email

router = APIRouter(prefix="/registrations", tags=["registrations"])

FREE_EMAIL_DOMAINS = {
    "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "hotmail.com",
    "outlook.com", "live.com", "msn.com", "aol.com", "proton.me",
    "protonmail.com", "icloud.com", "gmx.com", "mail.com", "yandex.com",
    "zoho.com", "qq.com", "163.com",
}
OFFICIAL_SUFFIXES = (".edu.ng", ".sch.ng", ".gov.ng", ".edu", ".gov", ".ac.uk")


def email_domain(email: str) -> str:
    return email.split("@")[-1].strip().lower()


def site_domain(url: str | None) -> str | None:
    if not url:
        return None
    m = re.search(r"([a-z0-9-]+(?:\.[a-z0-9-]+)+)", url.strip().lower())
    if not m:
        return None
    parts = m.group(1).split(".")
    if parts[0] in ("www", "m", "web") and len(parts) > 2:
        parts = parts[1:]
    return ".".join(parts)


def verification_decision(email: str, website: str | None) -> tuple[str, str]:
    """Return (verification, note). 'auto' => instantly approve."""
    ed, sd = email_domain(email), site_domain(website)
    if any(ed.endswith(sx) for sx in OFFICIAL_SUFFIXES):
        return "auto", "Instantly approved: official education domain " + ed
    if sd and sd == ed:
        return "auto", "Instantly approved: email domain matches school website"
    if ed in FREE_EMAIL_DOMAINS:
        return "review", "Personal email address - queued for manual verification"
    if sd:
        return "review", "Email domain and website differ - queued for manual verification"
    return "review", "Custom email domain without website - queued for manual verification"


def create_tenant(db: Session, request: SchoolRegistrationRequest, slug: str | None) -> School:
    """Create school + profile + school_admin membership. Caller commits."""
    school = School(
        zone_id=request.zone_id,
        name=request.school_name,
        slug=slug or unique_slug(db, request.school_name),
        school_type=request.school_type,
        institution_level=request.institution_level,
        status="active",
    )
    db.add(school)
    db.flush()
    db.add(SchoolProfile(school_id=school.id, is_published=False))
    admin = db.scalar(select(User).where(User.email == request.contact_email))
    if admin is None:
        admin = User(
            email=request.contact_email,
            display_name=request.contact_name,
            status="invited",
        )
        db.add(admin)
        db.flush()
    db.add(SchoolMembership(school_id=school.id, user_id=admin.id, role="school_admin"))
    return school



def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "school"


def unique_slug(db: Session, base: str) -> str:
    slug, n = slugify(base), 2
    while db.scalar(select(School).where(School.slug == slug)):
        slug = f"{slugify(base)}-{n}"
        n += 1
    return slug


@router.post("", response_model=RegistrationOut, status_code=201)
def submit_registration(body: RegistrationCreate, db: Session = Depends(get_db)):
    """Public endpoint. TODO: add rate limiting at the edge/middleware layer."""
    zone = db.scalar(
        select(Zone).where(
            Zone.country == body.country,
            Zone.state == body.state,
            Zone.lga == body.lga if body.lga else Zone.lga.is_(None),
        )
    )
    if zone is None:
        raise HTTPException(status_code=404, detail="This zone is not served by the platform yet.")

    request = SchoolRegistrationRequest(
        school_name=body.school_name,
        zone_id=zone.id,
        school_type=body.school_type,
        institution_level=getattr(body, "institution_level", "secondary"),
        contact_name=body.contact_name,
        contact_email=body.contact_email,
        contact_phone=body.contact_phone,
        evidence_ref=body.evidence_ref,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


@router.post("/{request_id}/approve", response_model=RegistrationOut)
def approve(
    request_id: int,
    body: ReviewDecision,
    reviewer: User = Depends(require_platform_role("platform_reviewer")),
    db: Session = Depends(get_db),
):
    request = db.get(SchoolRegistrationRequest, request_id)
    if not request or request.status != "pending":
        raise HTTPException(status_code=404, detail="No pending request with that id.")

    create_tenant(db, request, body.slug)
    request.status = "approved"
    request.reviewed_by_id = reviewer.id
    request.review_note = body.reason
    request.reviewed_at = datetime.utcnow()
    db.commit()
    return request


@router.post("/{request_id}/reject", response_model=RegistrationOut)
def reject(
    request_id: int,
    body: ReviewDecision,
    reviewer: User = Depends(require_platform_role("platform_reviewer")),
    db: Session = Depends(get_db),
):
    request = db.get(SchoolRegistrationRequest, request_id)
    if not request or request.status != "pending":
        raise HTTPException(status_code=404, detail="No pending request with that id.")
    request.status = "rejected"
    request.reviewed_by_id = reviewer.id
    request.review_note = body.reason
    request.reviewed_at = datetime.utcnow()
    db.commit()
    return request


@router.post("/mine", response_model=RegistrationMineOut, status_code=201)
def submit_registration_signed_in(
    body: RegistrationMineIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sign-in-first registration with automated verification."""
    zone = db.scalar(
        select(Zone).where(
            Zone.country == "Nigeria",
            Zone.state == body.state,
            Zone.lga == body.lga if body.lga else Zone.lga.is_(None),
        )
    )
    if zone is None:
        raise HTTPException(status_code=404, detail="This zone is not served by the platform yet.")

    already_admin = db.scalar(
        select(SchoolMembership).where(
            SchoolMembership.user_id == user.id,
            SchoolMembership.role == "school_admin",
        )
    )
    if already_admin:
        raise HTTPException(status_code=409, detail="You already administer a school on EduRise. Open your dashboard to manage it.")

    duplicate = db.scalar(
        select(SchoolRegistrationRequest).where(
            SchoolRegistrationRequest.contact_email == user.email,
            SchoolRegistrationRequest.school_name == body.school_name,
            SchoolRegistrationRequest.status == "pending",
        )
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="You already submitted this school for verification.")

    verification, note = verification_decision(user.email, body.school_website)
    evidence = body.evidence_ref or ""
    if body.school_website:
        evidence = (evidence + " | " if evidence else "") + "Website: " + body.school_website

    request = SchoolRegistrationRequest(
        school_name=body.school_name,
        zone_id=zone.id,
        school_type=body.school_type,
        institution_level=getattr(body, "institution_level", "secondary"),
        contact_name=body.contact_name or user.display_name or user.email.split("@")[0],
        contact_email=user.email,
        contact_phone=body.contact_phone,
        evidence_ref=evidence or None,
        status="approved" if verification == "auto" else "pending",
        review_note=note if verification == "auto" else None,
        reviewed_at=datetime.utcnow() if verification == "auto" else None,
    )
    db.add(request)
    db.flush()

    school_slug = None
    if verification == "auto":
        school = create_tenant(db, request, None)
        school_slug = school.slug
        user.status = "active"
        db.flush()
        try:
            send_email(
                db,
                school_id=school.id,
                user_id=user.id,
                to_email=user.email,
                subject="Your school is live on EduRise",
                html="<p>Good news — <b>" + request.school_name + "</b> has been verified and is now live on EduRise.</p>"
                     "<p>Signed in with your Google account, you are the school administrator. "
                     "Open your dashboard to complete your profile and invite staff.</p>"
                     "<p>— The EduRise team</p>",
                event_key="reg-auto-approved-" + str(request.id),
            )
        except Exception:
            pass  # email failure must never block approval
    db.commit()
    db.refresh(request)
    return RegistrationMineOut(
        id=request.id, school_name=request.school_name, status=request.status,
        verification=verification, review_note=request.review_note,
        school_slug=school_slug, created_at=request.created_at,
    )


@router.get("/mine", response_model=list[MyRegistrationOut])
def my_registrations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(SchoolRegistrationRequest)
        .where(SchoolRegistrationRequest.contact_email == user.email)
        .order_by(SchoolRegistrationRequest.created_at.desc())
    ).all()
    return [
        MyRegistrationOut(
            id=r.id, school_name=r.school_name, status=r.status,
            review_note=r.review_note, created_at=r.created_at,
        )
        for r in rows
    ]
