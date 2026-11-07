"""Task routes, with tenant isolation enforced on every read and write.

The ID-tampering test in tests/test_isolation.py exercises this directly:
a member of School A requesting School B's task gets a 404, not the task.
"""
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.people import User
from app.models.tenancy import School
from app.services.notifications import send_task_assigned
from app.models.work import Task
from app.schemas.api import TaskCreate, TaskOut, TaskUpdate
from app.services.membership import AuthContext, get_auth, require_roles

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _visible_or_404(db: Session, auth: AuthContext, task_id: int) -> Task:
    task = db.get(Task, task_id)
    # 404 (not 403) so existence of other schools' tasks is never confirmed
    if task is None or task.school_id != auth.school_id:
        raise HTTPException(status_code=404, detail="Task not found.")
    if task.assignee_id != auth.user.id and not auth.is_manager \
            and task.created_by_id != auth.user.id:
        raise HTTPException(status_code=404, detail="Task not found.")
    return task


@router.get("", response_model=list[TaskOut])
def list_tasks(auth: AuthContext = Depends(get_auth), db: Session = Depends(get_db)):
    query = select(Task).where(Task.school_id == auth.school_id)
    if not auth.is_manager:
        query = query.where(Task.assignee_id == auth.user.id)
    return db.scalars(query.order_by(Task.due_at)).all()


@router.post("", response_model=TaskOut, status_code=201)
def create_task(
    body: TaskCreate,
    auth: AuthContext = Depends(require_roles("manager", "school_admin")),
    db: Session = Depends(get_db),
):
    assignee = db.scalar(
        select(User).where(User.email == body.assignee_email)
    )
    # the assignee must belong to the same school as the caller
    from app.models.people import SchoolMembership
    membership = db.scalar(
        select(SchoolMembership).where(
            SchoolMembership.user_id == assignee.id if assignee else None,
            SchoolMembership.school_id == auth.school_id,
            SchoolMembership.status == "active",
        )
    )
    if not assignee or not membership:
        raise HTTPException(
            status_code=400, detail="Assignee is not an active member of your school."
        )

    task = Task(
        school_id=auth.school_id,  # ALWAYS the caller's school, never client-supplied
        title=body.title,
        description=body.description,
        assignee_id=assignee.id,
        created_by_id=auth.user.id,
        priority=body.priority,
        due_at=body.due_at,
        goal_id=body.goal_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    school = db.get(School, auth.school_id)
    send_task_assigned(db, school, task, assignee)  # idempotent on task+assignee
    return task


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int,
    auth: AuthContext = Depends(get_auth),
    db: Session = Depends(get_db),
):
    return _visible_or_404(db, auth, task_id)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    body: TaskUpdate,
    auth: AuthContext = Depends(get_auth),
    db: Session = Depends(get_db),
):
    task = _visible_or_404(db, auth, task_id)

    if task.assignee_id == auth.user.id:
        # assignee: progress/status only
        allowed = {"status", "priority"}
        if body.status == "completed":
            task.completed_at = datetime.utcnow()
    elif auth.is_manager:
        allowed = {"title", "description", "status", "priority", "due_at"}
    else:
        raise HTTPException(status_code=404, detail="Task not found.")

    updates = body.model_dump(exclude_unset=True)
    for field in updates:
        if field in allowed:
            setattr(task, field, updates[field])
    db.commit()
    db.refresh(task)
    return task
