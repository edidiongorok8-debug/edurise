"""Due-date reminder sweep.

Serverless-safe design (blueprint 7): no long-running loop. This is a
short, idempotent job a scheduled trigger (cron/queue) calls once per
day. Duplicate sends are impossible thanks to event_key idempotency.

Run:
    DATABASE_URL=... python -m app.scripts.send_due_reminders
"""
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.people import User
from app.models.tenancy import School
from app.models.notification import Notification
from app.models.work import Task
from app.services.notifications import send_due_reminder

LOOKAHEAD_DAYS = 3
OPEN_STATUSES = ("assigned", "in_progress", "blocked", "draft")


def sweep(db: Session, today: date | None = None) -> int:
    """Send one reminder per task due within the lookahead window. Returns count."""
    today = today or date.today()
    horizon = today + timedelta(days=LOOKAHEAD_DAYS)

    rows = db.execute(
        select(Task, User, School)
        .join(User, User.id == Task.assignee_id)
        .join(School, School.id == Task.school_id)
        .where(
            Task.status.in_(OPEN_STATUSES),
            Task.due_at.isnot(None),
            Task.due_at >= today,
            Task.due_at <= horizon,
        )
    ).all()

    sent = 0
    for task, assignee, school in rows:
        already_sent = db.scalar(
            select(Notification).where(
                Notification.user_id == assignee.id,
                Notification.event_key == f"task_due:{task.id}:{task.due_at}",
                Notification.status == "sent",
            )
        )
        if already_sent:
            continue
        record = send_due_reminder(db, school, task, assignee)
        if record.status == "sent":
            sent += 1
    return sent


if __name__ == "__main__":
    db = SessionLocal()
    try:
        print(f"Due reminders sent: {sweep(db)}")
    finally:
        db.close()
