"""Staff workspace models: goals, tasks, comments."""
from datetime import datetime
from sqlalchemy import ForeignKey, Text, Date, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Goal(Base):
    __tablename__ = "goals"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    success_criteria: Mapped[str] = mapped_column(Text, nullable=False)
    progress_method: Mapped[str] = mapped_column(Text, nullable=False, default="percentage")
    progress_value: Mapped[float] = mapped_column(default=0)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="draft")
    start_at: Mapped[str | None] = mapped_column(Date)
    target_at: Mapped[str | None] = mapped_column(Date)
    completed_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    goal_id: Mapped[int | None] = mapped_column(ForeignKey("goals.id"))
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    assignee_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    priority: Mapped[str] = mapped_column(Text, nullable=False, default="normal")
    status: Mapped[str] = mapped_column(Text, nullable=False, default="assigned")
    start_at: Mapped[str | None] = mapped_column(Date)
    due_at: Mapped[str | None] = mapped_column(Date)
    completed_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class TaskComment(Base):
    __tablename__ = "task_comments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), nullable=False)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    visibility: Mapped[str] = mapped_column(Text, nullable=False, default="assignee_and_managers")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
