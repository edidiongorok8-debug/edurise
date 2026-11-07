"""Pydantic request/response schemas."""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, Field

# --- Auth ---


class GoogleCredential(BaseModel):
    credential: str = Field(min_length=20)


class MembershipOut(BaseModel):
    school_id: int
    school_name: str
    role: str


class MeOut(BaseModel):
    id: int
    email: str
    display_name: str
    active_school_id: int
    active_school_name: str | None = None
    role: str


# --- Registration ---


class RegistrationCreate(BaseModel):
    school_name: str = Field(min_length=3, max_length=160)
    country: str = "Nigeria"
    state: str = Field(min_length=2)
    lga: str | None = None
    school_type: Literal["public", "private", "faith_based", "other"]
    institution_level: Literal["secondary", "university", "tertiary"] = "secondary"
    contact_name: str = Field(min_length=2)
    contact_email: EmailStr
    contact_phone: str | None = None
    evidence_ref: str | None = None


class RegistrationOut(BaseModel):
    id: int
    school_name: str
    status: str
    created_at: datetime


class RegistrationMineIn(BaseModel):
    school_name: str = Field(min_length=3, max_length=160)
    state: str = Field(min_length=2)
    lga: str | None = None
    school_type: Literal["public", "private", "faith_based", "other"]
    institution_level: Literal["secondary", "university", "tertiary"] = "secondary"
    contact_name: str | None = Field(default=None, max_length=120)
    contact_phone: str | None = Field(default=None, max_length=30)
    school_website: str | None = Field(default=None, max_length=200)
    evidence_ref: str | None = Field(default=None, max_length=400)


class RegistrationMineOut(BaseModel):
    id: int
    school_name: str
    status: str
    verification: str
    review_note: str | None
    school_slug: str | None
    created_at: datetime


class MyRegistrationOut(BaseModel):
    id: int
    school_name: str
    status: str
    review_note: str | None
    created_at: datetime


class ReviewDecision(BaseModel):
    reason: str | None = None
    slug: str | None = Field(default=None, pattern=r"^[a-z0-9-]+$")


# --- Tasks ---


class TaskCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = None
    assignee_email: EmailStr
    priority: Literal["low", "normal", "high"] = "normal"
    due_at: str | None = None
    goal_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: Literal[
        "draft", "assigned", "in_progress", "blocked",
        "submitted_for_review", "completed", "cancelled",
    ] | None = None
    priority: Literal["low", "normal", "high"] | None = None
    due_at: str | None = None


class TaskOut(BaseModel):
    id: int
    school_id: int
    title: str
    description: str | None
    assignee_id: int
    status: str
    priority: str
    due_at: str | None
    created_at: datetime


# --- Community ---


class SchoolCard(BaseModel):
    id: int | None = None
    image_url: str | None = None
    name: str
    slug: str
    school_type: str
    state: str
    lga: str | None
    about: str | None


class MetricOut(BaseModel):
    school_slug: str
    metric_type: str
    period: str
    value: float
    value_unit: str


class EventOut(BaseModel):
    school_slug: str
    title: str
    category: str | None
    starts_at: datetime
    ends_at: datetime | None
