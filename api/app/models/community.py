"""Community layer models: metrics, events, achievements."""
from datetime import datetime
from sqlalchemy import ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class CommunityMetric(Base):
    __tablename__ = "community_metrics"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    metric_type: Mapped[str] = mapped_column(Text, nullable=False)
    period: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[float] = mapped_column(nullable=False)
    value_unit: Mapped[str] = mapped_column(Text, nullable=False, default="percent")
    source: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("school_id", "metric_type", "period", name="uq_metric"),)


class SchoolEvent(Base):
    __tablename__ = "school_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(Text)
    starts_at: Mapped[datetime] = mapped_column(nullable=False)
    ends_at: Mapped[datetime | None]
    visibility: Mapped[str] = mapped_column(Text, nullable=False, default="community")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class Achievement(Base):
    __tablename__ = "achievements"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    awarded_at: Mapped[str | None]
    evidence_media_id: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class CommunityPost(Base):
    """A controlled, school-attributed post. No personal data is stored."""
    __tablename__ = "community_posts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    author_role: Mapped[str] = mapped_column(Text, nullable=False, default="student")
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    topic: Mapped[str] = mapped_column(Text, nullable=False, default="general")
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="published")
    flags: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    client_hash: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class CommunityMessage(Base):
    """A chat message in a zone room. School + role only, never personal data."""
    __tablename__ = "community_messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    channel: Mapped[str] = mapped_column(Text, nullable=False, default="zone")
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    author_role: Mapped[str] = mapped_column(Text, nullable=False, default="student")
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="published")
    flags: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    client_hash: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
