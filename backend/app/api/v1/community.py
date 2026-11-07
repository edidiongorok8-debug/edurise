"""Public community layer: published school profiles, aggregates, events.

Read-only and public. Only school-level, published data is ever exposed;
no student or staff records appear here at all.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.community import CommunityMetric, SchoolEvent
from app.models.tenancy import School, SchoolProfile, Zone
from app.schemas.api import EventOut, MetricOut, SchoolCard

router = APIRouter(prefix="/community", tags=["community"])


def _published_query(db: Session):
    return (
        select(School, SchoolProfile, Zone)
        .join(SchoolProfile, SchoolProfile.school_id == School.id)
        .join(Zone, Zone.id == School.zone_id)
        .where(School.status == "active", SchoolProfile.is_published.is_(True))
    )


@router.get("/schools", response_model=list[SchoolCard])
def list_schools(state: str | None = None, db: Session = Depends(get_db)):
    query = _published_query(db)
    if state:
        query = query.where(Zone.state == state)
    rows = db.execute(query).all()
    return [
        SchoolCard(
            name=school.name, slug=school.slug, school_type=school.school_type,
            state=zone.state, lga=zone.lga, about=profile.about,
            image_url=f"/api/v1/community/schools/{school.slug}/image" if profile.image_data else None,
        )
        for school, profile, zone in rows
    ]


@router.get("/schools/{slug}/metrics", response_model=list[MetricOut])
def school_metrics(slug: str, db: Session = Depends(get_db)):
    school = db.scalar(select(School).where(School.slug == slug))
    if not school:
        raise HTTPException(status_code=404, detail="School not found.")
    rows = db.scalars(
        select(CommunityMetric).where(
            CommunityMetric.school_id == school.id,
            CommunityMetric.published_at.isnot(None),  # published aggregates only
        )
    ).all()
    return [
        MetricOut(
            school_slug=slug, metric_type=m.metric_type, period=m.period,
            value=m.value, value_unit=m.value_unit,
        )
        for m in rows
    ]


@router.get("/events", response_model=list[EventOut])
def upcoming_events(limit: int = 20, db: Session = Depends(get_db)):
    rows = db.execute(
        select(School, SchoolProfile, Zone, SchoolEvent)
        .join(SchoolProfile, SchoolProfile.school_id == School.id)
        .join(Zone, Zone.id == School.zone_id)
        .join(SchoolEvent, SchoolEvent.school_id == School.id)
        .where(
            School.status == "active",
            SchoolProfile.is_published.is_(True),
            SchoolEvent.visibility == "community",
            SchoolEvent.starts_at > datetime.utcnow(),
        )
        .order_by(SchoolEvent.starts_at)
        .limit(limit)
    ).all()
    return [
        EventOut(
            school_slug=school.slug, title=event.title, category=event.category,
            starts_at=event.starts_at, ends_at=event.ends_at,
        )
        for school, profile, zone, event in rows
    ]


@router.get("/schools/{slug}/image")
def school_image(slug: str, db: Session = Depends(get_db)):
    school = db.scalar(select(School).where(School.slug == slug))
    if not school:
        raise HTTPException(status_code=404, detail="School not found.")
    profile = db.scalar(select(SchoolProfile).where(SchoolProfile.school_id == school.id))
    if not profile or not profile.image_data:
        raise HTTPException(status_code=404, detail="No image.")
    header, _, b64 = profile.image_data.partition(",")
    import base64
    media = header.split(":", 1)[1].split(";", 1)[0] if ":" in header else "image/jpeg"
    return Response(content=base64.b64decode(b64), media_type=media)
