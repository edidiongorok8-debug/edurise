"""Transactional email via Resend, with idempotent delivery.

Every logical event has an event_key; a retry of the same event can
never send twice (blueprint risk table: "Duplicate notifications").
The notification record, not the email, is the delivery ledger.
"""
import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.notification import Notification

RESEND_ENDPOINT = "https://api.resend.com/emails"


def deliver_via_resend(api_key: str, payload: dict) -> tuple[bool, str | None, str | None]:
    """Returns (ok, provider_message_id, failure_code)."""
    r = httpx.post(
        RESEND_ENDPOINT,
        headers={"Authorization": f"Bearer {api_key}"},
        json=payload,
        timeout=10.0,
    )
    if r.status_code in (200, 201):
        return True, r.json().get("id"), None
    return False, None, f"resend_http_{r.status_code}"


def send_email(
    db: Session,
    *,
    school_id: int,
    user_id: int,
    to_email: str,
    subject: str,
    html: str,
    event_key: str,
    transport=None,
) -> Notification:
    """Send one email, recording the outcome. Idempotent on (user, event_key)."""
    settings = get_settings()

    existing = db.scalar(
        select(Notification).where(
            Notification.user_id == user_id,
            Notification.event_key == event_key,
        )
    )
    if existing is not None and existing.status == "sent":
        return existing  # already delivered; never re-send

    if existing is None:
        record = Notification(
            school_id=school_id, user_id=user_id,
            event_key=event_key, channel="email", status="pending",
        )
        db.add(record)
        db.flush()
    else:
        record = existing

    payload = {
        "from": settings.resend_from_email,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }

    if not settings.resend_api_key and transport is None:
        # email not configured (dev/test): record and skip, never crash a request
        ok, message_id, failure = False, None, "email_disabled"
    else:
        do_send = transport or deliver_via_resend
        try:
            ok, message_id, failure = do_send(settings.resend_api_key, payload)
        except Exception as exc:  # network/provider errors must not break the request
            ok, message_id, failure = False, None, f"transport_error:{type(exc).__name__}"

    record.provider_message_id = message_id
    record.failure_code = failure
    from datetime import datetime
    record.sent_at = datetime.utcnow() if ok else None
    record.status = "sent" if ok else "failed"
    db.commit()
    db.refresh(record)
    return record
