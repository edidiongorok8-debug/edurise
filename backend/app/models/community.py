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
