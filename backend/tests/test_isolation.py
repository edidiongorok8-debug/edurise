"""Cross-tenant isolation tests (blueprint section 11, security tests).

The single most important test suite in the project. Run against a
Postgres test database:

    DATABASE_URL=postgres://.../test SESSION_SECRET=x GOOGLE_CLIENT_ID=x pytest

Scenario: a teacher in School A must not read, list or edit a task of
School B, even with a valid session and a known task id.
"""
import os

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.security import SESSION_COOKIE
from app.db.session import Base, SessionLocal, engine
from app.main import app
from app.models.people import SchoolMembership, User
from app.models.tenancy import School, SchoolProfile, Zone
from app.models.work import Task

SECRET = os.environ.get("SESSION_SECRET", "test-secret")


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(engine)


def make_session(user_id: int, school_id: int) -> dict:
    return {SESSION_COOKIE: jwt.encode(
        {"user_id": user_id, "school_id": school_id}, SECRET, algorithm="HS256"
    )}


@pytest.fixture(scope="module")
def world():
    """Two schools, one teacher in each, one task in school B."""
    db = SessionLocal()
    zone = Zone(country="Nigeria", state="Oyo", lga=None, slug="oyo")
    db.add(zone)
    db.flush()

    school_a = School(zone_id=zone.id, name="School A", slug="school-a",
                      school_type="private", status="active")
    school_b = School(zone_id=zone.id, name="School B", slug="school-b",
                      school_type="private", status="active")
    db.add_all([school_a, school_b])
    db.flush()
    db.add_all([SchoolProfile(school_id=school_a.id, is_published=True),
                SchoolProfile(school_id=school_b.id, is_published=True)])
    db.flush()

    teacher_a = User(email="teacher.a@test.ng", display_name="Teacher A",
                     google_subject="ga", status="active")
    teacher_b = User(email="teacher.b@test.ng", display_name="Teacher B",
                     google_subject="gb", status="active")
    db.add_all([teacher_a, teacher_b])
    db.flush()

    db.add_all([
        SchoolMembership(school_id=school_a.id, user_id=teacher_a.id, role="teacher_staff"),
        SchoolMembership(school_id=school_b.id, user_id=teacher_b.id, role="teacher_staff"),
    ])
    db.flush()

    task_b = Task(school_id=school_b.id, title="School B private task",
                  assignee_id=teacher_b.id, created_by_id=teacher_b.id)
    db.add(task_b)
    db.commit()

    data = {
        "teacher_a": teacher_a, "teacher_b": teacher_b,
        "school_a": school_a, "school_b": school_b, "task_b_id": task_b.id,
    }
    yield data
    db.close()


def test_teacher_a_cannot_read_school_b_task(client, world):
    cookies = make_session(world["teacher_a"].id, world["school_a"].id)
    r = client.get(f"/api/v1/tasks/{world['task_b_id']}", cookies=cookies)
    assert r.status_code == 404, "cross-tenant task read must fail with 404"


def test_teacher_a_sees_only_own_tasks(client, world):
    cookies = make_session(world["teacher_a"].id, world["school_a"].id)
    r = client.get("/api/v1/tasks", cookies=cookies)
    assert r.status_code == 200
    assert r.json() == [], "no school B tasks may leak into school A's list"


def test_teacher_a_cannot_edit_school_b_task(client, world):
    cookies = make_session(world["teacher_a"].id, world["school_a"].id)
    r = client.patch(
        f"/api/v1/tasks/{world['task_b_id']}",
        json={"status": "completed"}, cookies=cookies,
    )
    assert r.status_code == 404
    # and confirm it did NOT actually change
    r2 = client.get(f"/api/v1/tasks/{world['task_b_id']}",
                    cookies=make_session(world["teacher_b"].id, world["school_b"].id))
    assert r2.json()["status"] != "completed"


def test_no_session_no_access(client):
    r = client.get("/api/v1/tasks")
    assert r.status_code == 401
