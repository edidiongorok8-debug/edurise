"""Public community layer: published school profiles, aggregates, events.

Read-only and public. Only school-level, published data is ever exposed;
no student or staff records appear here at all.
"""
import hashlib, re
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.community import CommunityMessage, CommunityMetric, CommunityPost, SchoolEvent
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
            id=school.id, name=school.name, slug=school.slug, school_type=school.school_type,
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


# ---------------------------------------------------------------- shared wall
TOPICS = {"general", "study", "exams", "careers", "sports", "ideas"}
ROLES = {"student", "teacher"}
MAX_LEN = 600
MIN_LEN = 12
RATE_PER_HOUR = 5
AUTO_HIDE_FLAGS = 3

BLOCKED = {
    "fuck", "shit", "bitch", "bastard", "idiot", "stupid", "hate", "kill", "sex",
    "porn", "nude", "scam", "419", "yahoo boy", "cult", "weed", "drugs", "money transfer",
}

def _clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)                       # no html
    text = re.sub(r"https?://\S+|www\.\S+", "[link removed]", text)  # no links
    text = re.sub(r"\b\+?\d[\d\s-]{8,}\b", "[number removed]", text)  # no phone numbers
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def _client_hash(request: Request) -> str:
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or "0"
    ua = request.headers.get("user-agent", "")
    return hashlib.sha256((ip + "|" + ua).encode()).hexdigest()[:32]

def _flagged(text: str) -> bool:
    low = text.lower()
    return any(word in low for word in BLOCKED)

@router.get("/posts")
def list_posts(topic: str | None = None, limit: int = 40, db: Session = Depends(get_db)):
    q = (
        select(CommunityPost, School.name)
        .join(School, School.id == CommunityPost.school_id)
        .where(CommunityPost.status == "published")
        .order_by(CommunityPost.created_at.desc())
        .limit(min(limit, 80))
    )
    if topic and topic in TOPICS:
        q = q.where(CommunityPost.topic == topic)
    rows = db.execute(q).all()
    return [
        {
            "id": p.id,
            "author": p.display_name,
            "role": p.author_role,
            "school": school_name,
            "topic": p.topic,
            "body": p.body,
            "created_at": p.created_at.isoformat() + "Z" if p.created_at else None,
        }
        for p, school_name in rows
    ]

@router.post("/posts", status_code=201)
def create_post(payload: dict, request: Request, db: Session = Depends(get_db)):
    school_id = payload.get("school_id")
    role = (payload.get("role") or "student").lower()
    topic = (payload.get("topic") or "general").lower()
    body = _clean(str(payload.get("body") or ""))

    if role not in ROLES:
        raise HTTPException(400, "Unknown role")
    if topic not in TOPICS:
        topic = "general"
    if not isinstance(school_id, int):
        raise HTTPException(400, "Tell us which school you are posting for")
    if len(body) < MIN_LEN:
        raise HTTPException(400, f"Say a little more, at least {MIN_LEN} characters")
    if len(body) > MAX_LEN:
        raise HTTPException(400, f"Keep it under {MAX_LEN} characters")

    school = db.get(School, school_id)
    if not school or school.status != "active":
        raise HTTPException(404, "That school is not active on EduRise")

    ch = _client_hash(request)
    hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent = db.execute(
        select(CommunityPost).where(CommunityPost.client_hash == ch, CommunityPost.created_at >= hour_ago)
    ).scalars().all()
    if len(recent) >= RATE_PER_HOUR:
        raise HTTPException(429, "Easy now, that is a lot of posts. Try again in a little while.")

    label = "Student" if role == "student" else "Teacher"
    post = CommunityPost(
        school_id=school.id,
        author_role=role,
        display_name=f"{label} \u00b7 {school.name}",
        topic=topic,
        body=body,
        status="pending" if _flagged(body) else "published",
        client_hash=ch,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    if post.status != "published":
        return {"id": post.id, "status": "pending",
                "message": "Thanks. A moderator will take a look before this goes up."}
    return {"id": post.id, "status": "published", "message": "Posted to the zone wall."}

@router.post("/posts/{post_id}/report", status_code=202)
def report_post(post_id: int, db: Session = Depends(get_db)):
    post = db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(404, "Post not found")
    post.flags += 1
    if post.flags >= AUTO_HIDE_FLAGS:
        post.status = "hidden"
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- chat rooms
ROOMS = {"zone": "The zone", "study": "Study room", "exams": "Exams room",
         "sports": "Sports room", "careers": "Careers room", "ideas": "Ideas room"}
CHAT_MAX = 400
CHAT_MIN = 2
CHAT_RATE = 25          # messages per hour per device
CHAT_WINDOW = timedelta(hours=1)


@router.get("/rooms")
def list_rooms():
    return [{"key": k, "name": v} for k, v in ROOMS.items()]


@router.get("/messages")
def list_messages(channel: str = "zone", after_id: int | None = None,
                  request: Request = None, limit: int = 60, db: Session = Depends(get_db)):
    if channel not in ROOMS:
        channel = "zone"
    q = (
        select(CommunityMessage, School.name)
        .join(School, School.id == CommunityMessage.school_id)
        .where(CommunityMessage.channel == channel, CommunityMessage.status == "published")
        .order_by(CommunityMessage.created_at.asc())
        .limit(min(limit, 120))
    )
    if after_id:
        q = q.where(CommunityMessage.id > after_id)
    rows = db.execute(q).all()
    me = _client_hash(request) if request is not None else ""
    return [
        {
            "id": m.id,
            "author": m.display_name,
            "role": m.author_role,
            "school": school_name,
            "body": m.body,
            "mine": bool(m.client_hash and m.client_hash == me),
            "created_at": m.created_at.isoformat() + "Z" if m.created_at else None,
        }
        for m, school_name in rows
    ]


@router.post("/messages", status_code=201)
def send_message(payload: dict, request: Request, db: Session = Depends(get_db)):
    channel = (payload.get("channel") or "zone").lower()
    role = (payload.get("role") or "student").lower()
    body = _clean(str(payload.get("body") or ""))
    school_id = payload.get("school_id")

    if channel not in ROOMS:
        raise HTTPException(400, "Unknown room")
    if role not in ROLES:
        raise HTTPException(400, "Unknown role")
    if not isinstance(school_id, int):
        raise HTTPException(400, "Choose your school first")
    if len(body) < CHAT_MIN:
        raise HTTPException(400, "Type a message first")
    if len(body) > CHAT_MAX:
        raise HTTPException(400, f"Keep it under {CHAT_MAX} characters")

    school = db.get(School, school_id)
    if not school or school.status != "active":
        raise HTTPException(404, "That school is not active on EduRise")

    ch = _client_hash(request)
    since = datetime.utcnow() - CHAT_WINDOW
    recent = db.execute(
        select(CommunityMessage).where(CommunityMessage.client_hash == ch,
                                       CommunityMessage.created_at >= since)
    ).scalars().all()
    if len(recent) >= CHAT_RATE:
        raise HTTPException(429, "You are sending fast. Give it a moment.")

    label = "Student" if role == "student" else "Teacher"
    msg = CommunityMessage(
        channel=channel,
        school_id=school.id,
        author_role=role,
        display_name=f"{label} \u00b7 {school.name}",
        body=body,
        status="pending" if _flagged(body) else "published",
        client_hash=ch,
    )
    db.add(msg); db.commit(); db.refresh(msg)
    if msg.status != "published":
        return {"id": msg.id, "status": "pending", "message": "Held for a moderator to review."}
    return {"id": msg.id, "status": "published", "message": "Sent"}


@router.post("/messages/{msg_id}/report", status_code=202)
def report_message(msg_id: int, db: Session = Depends(get_db)):
    msg = db.get(CommunityMessage, msg_id)
    if not msg:
        raise HTTPException(404, "Message not found")
    msg.flags += 1
    if msg.flags >= AUTO_HIDE_FLAGS:
        msg.status = "hidden"
    db.commit()
    return {"ok": True}
