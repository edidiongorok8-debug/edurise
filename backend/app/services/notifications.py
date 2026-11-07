"""Higher-level notification flows: invitations, task assignment, due reminders."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.people import User
from app.models.tenancy import School
from app.models.work import Task
from app.models.notification import Notification
from app.services.email import send_email

EMAIL_FOOTER = (
    "<p style='color:#888;font-size:12px;margin-top:24px'>"
    "You received this message because you are a member of your school on "
    "the community platform. If this was not expected, ignore this email.</p>"
)


def _wrap(title: str, body_html: str) -> str:
    return f"<h2>{title}</h2>{body_html}{EMAIL_FOOTER}"


def send_staff_invite(db: Session, school: School, user: User, invite_link: str, transport=None) -> Notification:
    return send_email(
        db,
        school_id=school.id,
        user_id=user.id,
        to_email=user.email,
        subject=f"You have been invited to {school.name}",
        html=_wrap(
            f"Welcome to {school.name}",
            f"<p>{user.display_name}, your school administrator has invited you to the "
            f"staff workspace of <b>{school.name}</b>.</p>"
            f"<p><a href='{invite_link}'>Sign in with your Google account</a> to activate "
            f"your account.</p>",
        ),
        event_key=f"invite:{school.id}:{user.id}",
        transport=transport,
    )


def send_task_assigned(db: Session, school: School, task: Task, assignee: User, transport=None) -> None:
    due = f", due <b>{task.due_at}</b>" if task.due_at else ""
    send_email(
        db,
        school_id=school.id,
        user_id=assignee.id,
        to_email=assignee.email,
        subject=f"New task assigned: {task.title}",
        html=_wrap(
            "A new task has been assigned to you",
            f"<p><b>{task.title}</b>{due}</p>"
            + (f"<p>{task.description}</p>" if task.description else "")
            + "<p>Open your staff workspace to view and update it.</p>",
        ),
        event_key=f"task_assigned:{task.id}:{assignee.id}",
        transport=transport,
    )


def send_due_reminder(db: Session, school: School, task: Task, assignee: User, transport=None) -> Notification:
    return send_email(
        db,
        school_id=school.id,
        user_id=assignee.id,
        to_email=assignee.email,
        subject=f"Reminder: '{task.title}' is due soon",
        html=_wrap(
            "Task due soon",
            f"<p><b>{task.title}</b> is due on <b>{task.due_at}</b>.</p>"
            "<p>Open your staff workspace to update its status.</p>",
        ),
        event_key=f"task_due:{task.id}:{task.due_at}",
        transport=transport,
    )
