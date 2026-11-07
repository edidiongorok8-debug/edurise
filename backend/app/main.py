"""API entrypoint.

Serverless-friendly: no background loops, no in-memory state, every
request resolves its own session (see blueprint section 7).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import analytics, auth, community, competitions, registrations, staff, tasks, tutor
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="School Community Platform API",
    version="0.1.0",
    docs_url="/api/docs" if settings.environment != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],  # never "*" with credentials
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(registrations.router, prefix="/api/v1")
app.include_router(staff.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(community.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(tutor.router, prefix="/api/v1")
app.include_router(competitions.router, prefix="/api/v1")




def ensure_competition_tables():
    """Idempotent DDL for virtual inter-school competitions (see item 5 of the pinned checklist)."""
    stmts = [
        "ALTER TABLE schools ADD COLUMN IF NOT EXISTS institution_level TEXT NOT NULL DEFAULT 'secondary'",
        "ALTER TABLE school_registration_requests ADD COLUMN IF NOT EXISTS institution_level TEXT NOT NULL DEFAULT 'secondary'",
        """
        CREATE TABLE IF NOT EXISTS tournaments (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL CHECK (category IN ('secondary','university')),
            description TEXT,
            organizer_name TEXT NOT NULL DEFAULT 'Zone Education Office',
            status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live','ended')),
            starts_at TIMESTAMPTZ,
            ends_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS tournament_teams (
            tournament_id BIGINT NOT NULL REFERENCES tournaments(id),
            school_id BIGINT NOT NULL REFERENCES schools(id),
            joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (tournament_id, school_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            tournament_id BIGINT NOT NULL REFERENCES tournaments(id),
            school_id BIGINT NOT NULL REFERENCES schools(id),
            user_id BIGINT NOT NULL REFERENCES users(id),
            track TEXT NOT NULL CHECK (track IN ('science','commercial','art')),
            category TEXT NOT NULL CHECK (category IN ('secondary','university')),
            questions_json TEXT NOT NULL,
            answers_json TEXT,
            score INT NOT NULL DEFAULT 0,
            max_score INT NOT NULL DEFAULT 50,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            finished_at TIMESTAMPTZ
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_attempts_tournament ON quiz_attempts(tournament_id, school_id, track)",
    ]
    try:
        from sqlalchemy import text
        from app.db.session import engine
        with engine.connect() as conn:
            for st in stmts:
                conn.execute(text(st))
            conn.commit()
    except Exception:
        pass  # cold start without DB: endpoints surface clean errors


@app.on_event("startup")
def ensure_columns():
    ensure_competition_tables()
    """Idempotent lightweight migration for hobby deployment (sandbox can't reach port 5432)."""
    try:
        from app.db.session import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE school_profiles ADD COLUMN IF NOT EXISTS image_data TEXT"))
            conn.commit()
    except Exception:
        pass  # cold start without DB: endpoint will surface a clean error

@app.get("/api/v1/health")
def health():
    return {"status": "ok"}


# Local convenience: serve the static frontend when the folder is present.
try:
    import os
    from fastapi.staticfiles import StaticFiles
    _assets = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=os.path.abspath(_assets)), name="assets")
    _pages = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "pages")
    if os.path.isdir(_pages):
        app.mount("/", StaticFiles(directory=os.path.abspath(_pages), html=True), name="pages")
except Exception:  # production serves the frontend separately
    pass
