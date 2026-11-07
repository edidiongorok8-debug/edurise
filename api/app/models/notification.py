"""Notification records (delivery ledger + idempotency)."""
from datetime import datetime
from sqlalchemy import ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    event_key: Mapped[str] = mapped_column(Text, nullable=False)  # unique per logical event
    channel: Mapped[str] = mapped_column(Text, nullable=False, default="email")
    status: Mapped[str] = mapped_column(Text, nullable=False, default="pending")
    provider_message_id: Mapped[str | None] = mapped_column(Text)
    sent_at: Mapped[datetime | None]
    failure_code: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("user_id", "event_key", name="uq_notification_event"),)
