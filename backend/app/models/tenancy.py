"""Zone and school tenancy models."""
from datetime import datetime
from sqlalchemy import ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Zone(Base):
    __tablename__ = "zones"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    country: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(Text, nullable=False)
    lga: Mapped[str | None] = mapped_column(Text)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class School(Base):
    __tablename__ = "schools"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    zone_id: Mapped[int] = mapped_column(ForeignKey("zones.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    school_type: Mapped[str] = mapped_column(Text, nullable=False)
    institution_level: Mapped[str] = mapped_column(Text, nullable=False, default="secondary")
    motto: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="pending_verification")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class SchoolProfile(Base):
    __tablename__ = "school_profiles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False, unique=True)
    about: Mapped[str | None] = mapped_column(Text)
    image_data: Mapped[str | None] = mapped_column(Text)  # data URL, school logo/profile image
    programmes: Mapped[str | None] = mapped_column(Text)
    is_published: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class SchoolRegistrationRequest(Base):
    __tablename__ = "school_registration_requests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    school_name: Mapped[str] = mapped_column(Text, nullable=False)
    zone_id: Mapped[int] = mapped_column(ForeignKey("zones.id"), nullable=False)
    school_type: Mapped[str] = mapped_column(Text, nullable=False)
    institution_level: Mapped[str] = mapped_column(Text, nullable=False, default="secondary")
    contact_name: Mapped[str] = mapped_column(Text, nullable=False)
    contact_email: Mapped[str] = mapped_column(Text, nullable=False)
    contact_phone: Mapped[str | None] = mapped_column(Text)
    evidence_ref: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="pending")
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    review_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    reviewed_at: Mapped[datetime | None]


class PlatformRole(Base):
    __tablename__ = "platform_roles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("user_id", "role", name="uq_platform_role"),)
