"""Email delivery tests: idempotency and failure handling.

Uses a fake transport; no network. Run like the isolation tests:

    DATABASE_URL=postgres://.../test pytest
"""
import pytest
from fastapi.testclient import TestClient

from app.db.session import Base, SessionLocal, engine
from app.main import app
from app.models.people import SchoolMembership, User
from app.models.tenancy import School, SchoolProfile, Zone
from app.services.email import send_email
from app.services.notifications import send_staff_invite, send_task_assigned
from app.models.work import Task


class FakeTransport:
    def __init__(self, fail=False):
        self.calls = 0
        self.fail = fail

    def __call__(self, api_key, payload):
        self.calls += 1
        if self.fail:
            return False, None, "resend_http_500"
        return True, f"msg-{self.calls}", None


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(engine)


@pytest.fixture(scope="module")
def world(client):
    db = SessionLocal()
    zone = Zone(country="Nigeria", state="Oyo", lga=None, slug="oyo2")
    db.add(zone); db.flush()
    school = School(zone_id=zone.id, name="Email Test School", slug="email-test-school",
                     school_type="private", status="active")
    db.add(school); db.flush()
    db.add(SchoolProfile(school_id=school.id, is_published=True)); db.flush()
    teacher = User(email="invitee@test.ng", display_name="Invitee", status="invited")
    db.add(teacher); db.flush()
    db.add(SchoolMembership(school_id=school.id, user_id=teacher.id, role="teacher_staff"))
    db.commit()
    yield {"db": db, "school": school, "teacher": teacher}
    db.close()


def test_invite_send_is_idempotent(world):
    transport = FakeTransport()
    for _ in range(3):  # three retries of the same logical event
        send_staff_invite(
            world["db"], world["school"], world["teacher"],
            invite_link="https://example.com/sign-in", transport=transport,
        )
    assert transport.calls == 1, "duplicate invite email must not be sent"


def test_task_assignment_uses_distinct_event_keys(world):
    db = world["db"]
    teacher = world["teacher"]
    transport = FakeTransport()
    t1 = Task(school_id=world["school"].id, title="Task one",
              assignee_id=teacher.id, created_by_id=teacher.id)
    t2 = Task(school_id=world["school"].id, title="Task two",
              assignee_id=teacher.id, created_by_id=teacher.id)
    db.add_all([t1, t2]); db.commit(); db.refresh(t1); db.refresh(t2)

    send_task_assigned(db, world["school"], t1, teacher, transport=transport)
    send_task_assigned(db, world["school"], t1, teacher, transport=transport)  # retry
    send_task_assigned(db, world["school"], t2, teacher, transport=transport)
    assert transport.calls == 2, "two distinct tasks, but retries never duplicate"


def test_failed_send_is_recorded_and_retry_allowed(world):
    db = world["db"]
    failing = FakeTransport(fail=True)
    record = send_email(
        db, school_id=world["school"].id, user_id=world["teacher"].id,
        to_email="x@test.ng", subject="s", html="<p>p</p>",
        event_key="once-only-key", transport=failing,
    )
    assert record.status == "failed" and record.failure_code

    working = FakeTransport()
    record = send_email(
        db, school_id=world["school"].id, user_id=world["teacher"].id,
        to_email="x@test.ng", subject="s", html="<p>p</p>",
        event_key="once-only-key", transport=working,
    )
    assert record.status == "sent" and working.calls == 1

    again = FakeTransport()
    record = send_email(
        db, school_id=world["school"].id, user_id=world["teacher"].id,
        to_email="x@test.ng", subject="s", html="<p>p</p>",
        event_key="once-only-key", transport=again,
    )
    assert again.calls == 0, "a delivered event must never be sent again"
