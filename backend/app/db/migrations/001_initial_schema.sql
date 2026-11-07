-- ============================================================
-- Migration 001 — Initial schema
-- School Community Platform (multi-tenant from day one)
-- Every school-owned record carries school_id.
-- ============================================================

-- ZONES -------------------------------------------------------
CREATE TABLE zones (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    country     TEXT NOT NULL,
    state       TEXT NOT NULL,
    lga         TEXT,                       -- nullable: zone may be state-wide
    slug        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SCHOOLS -----------------------------------------------------
CREATE TABLE schools (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    zone_id     BIGINT NOT NULL REFERENCES zones(id),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    school_type TEXT NOT NULL CHECK (school_type IN ('public','private','faith_based','other')),
    motto       TEXT,
    address     TEXT,
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('pending_verification','active','suspended','archived')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- REGISTRATION REQUESTS (before a school tenant exists) -------
CREATE TABLE school_registration_requests (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_name     TEXT NOT NULL,
    zone_id         BIGINT NOT NULL REFERENCES zones(id),
    school_type     TEXT NOT NULL,
    contact_name    TEXT NOT NULL,
    contact_email   TEXT NOT NULL,
    contact_phone   TEXT,
    evidence_ref    TEXT,                  -- link/identifier of legitimacy evidence
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
    reviewed_by_id  BIGINT,                -- platform reviewer (users.id), FK added after users
    review_note     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at     TIMESTAMPTZ
);

-- USERS -------------------------------------------------------
CREATE TABLE users (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    google_subject  TEXT UNIQUE,           -- Google's stable account id
    email           TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('invited','active','disabled')),
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE school_registration_requests
    ADD CONSTRAINT fk_req_reviewer
    FOREIGN KEY (reviewed_by_id) REFERENCES users(id);

-- SCHOOL MEMBERSHIPS (authorization lives here, not in Google) -
CREATE TABLE school_memberships (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id       BIGINT NOT NULL REFERENCES schools(id),
    user_id         BIGINT NOT NULL REFERENCES users(id),
    role            TEXT NOT NULL CHECK (role IN (
                        'school_admin','manager','teacher_staff','editor','publisher')),
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('pending','active','revoked')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, user_id)
);
CREATE INDEX idx_membership_user ON school_memberships(user_id);

-- TEAMS / DEPARTMENTS -----------------------------------------
CREATE TABLE teams (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id   BIGINT NOT NULL REFERENCES schools(id),
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, name)
);

-- GOALS -------------------------------------------------------
CREATE TABLE goals (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id         BIGINT NOT NULL REFERENCES schools(id),
    owner_id          BIGINT NOT NULL REFERENCES users(id),
    created_by_id     BIGINT NOT NULL REFERENCES users(id),
    title             TEXT NOT NULL,
    description       TEXT,
    success_criteria  TEXT NOT NULL,
    progress_method   TEXT NOT NULL DEFAULT 'percentage'
                      CHECK (progress_method IN ('percentage','checklist','numeric','milestone')),
    progress_value    NUMERIC NOT NULL DEFAULT 0,
    status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','active','in_review','completed','cancelled')),
    start_at          DATE,
    target_at         DATE,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_goals_school ON goals(school_id);
CREATE INDEX idx_goals_owner ON goals(owner_id);

-- TASKS -------------------------------------------------------
CREATE TABLE tasks (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id       BIGINT NOT NULL REFERENCES schools(id),
    goal_id         BIGINT REFERENCES goals(id),
    team_id         BIGINT REFERENCES teams(id),
    title           TEXT NOT NULL,
    description     TEXT,
    assignee_id     BIGINT NOT NULL REFERENCES users(id),
    created_by_id   BIGINT NOT NULL REFERENCES users(id),
    priority        TEXT NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('low','normal','high')),
    status          TEXT NOT NULL DEFAULT 'assigned'
                    CHECK (status IN ('draft','assigned','in_progress','blocked',
                                      'submitted_for_review','completed','cancelled')),
    recurrence_rule TEXT,                 -- optional, RFC-5545 style string
    start_at        DATE,
    due_at          DATE,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_school_assignee ON tasks(school_id, assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_at);

-- TASK COMMENTS -----------------------------------------------
CREATE TABLE task_comments (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id     BIGINT NOT NULL REFERENCES tasks(id),
    author_id   BIGINT NOT NULL REFERENCES users(id),
    body        TEXT NOT NULL,
    visibility  TEXT NOT NULL DEFAULT 'assignee_and_managers'
                CHECK (visibility IN ('assignee_and_managers','school_admins')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_task ON task_comments(task_id);

-- ARTICLES (community blog / policy) --------------------------
CREATE TABLE articles (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id         BIGINT REFERENCES schools(id),   -- null = platform-wide article
    slug              TEXT NOT NULL UNIQUE,
    title             TEXT NOT NULL,
    summary           TEXT,
    body              TEXT NOT NULL,
    category          TEXT NOT NULL DEFAULT 'policy',
    status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','in_review','approved','published','archived','corrected')),
    author_id         BIGINT NOT NULL REFERENCES users(id),
    reviewer_id       BIGINT REFERENCES users(id),
    published_at      TIMESTAMPTZ,
    last_reviewed_at  TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_articles_status ON articles(status);

CREATE TABLE article_sources (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    article_id         BIGINT NOT NULL REFERENCES articles(id),
    source_title       TEXT NOT NULL,
    source_url         TEXT NOT NULL,
    issuing_authority  TEXT NOT NULL,
    source_date        DATE,
    checked_at         DATE NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE article_revisions (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    article_id     BIGINT NOT NULL REFERENCES articles(id),
    editor_id      BIGINT NOT NULL REFERENCES users(id),
    revision_note  TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ANNOUNCEMENTS ------------------------------------------------
CREATE TABLE announcements (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id     BIGINT NOT NULL REFERENCES schools(id),
    title         TEXT NOT NULL,
    body          TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','published','archived')),
    published_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_announcements_school ON announcements(school_id, status);

-- COMMUNITY PROFILE -------------------------------------------
CREATE TABLE school_profiles (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id      BIGINT NOT NULL UNIQUE REFERENCES schools(id),
    about          TEXT,
    programmes     TEXT,
    is_published   BOOLEAN NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- COMMUNITY METRICS (school-level aggregates only) -------------
CREATE TABLE community_metrics (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id     BIGINT NOT NULL REFERENCES schools(id),
    metric_type   TEXT NOT NULL CHECK (metric_type IN
                  ('enrollment','waec_aggregate','jamb_aggregate','other')),
    period        TEXT NOT NULL,           -- e.g. '2025/2026'
    value          NUMERIC NOT NULL,
    value_unit     TEXT NOT NULL DEFAULT 'percent',
    source         TEXT,
    published_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, metric_type, period)
);
CREATE INDEX idx_metrics_public ON community_metrics(school_id, metric_type, period);

-- SCHOOL EVENTS -------------------------------------------------
CREATE TABLE school_events (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id   BIGINT NOT NULL REFERENCES schools(id),
    title       TEXT NOT NULL,
    category    TEXT,
    starts_at   TIMESTAMPTZ NOT NULL,
    ends_at     TIMESTAMPTZ,
    visibility  TEXT NOT NULL DEFAULT 'community'
                CHECK (visibility IN ('community','school_only')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_school_start ON school_events(school_id, starts_at);

-- ACHIEVEMENTS ---------------------------------------------------
CREATE TABLE achievements (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id         BIGINT NOT NULL REFERENCES schools(id),
    title             TEXT NOT NULL,
    description       TEXT,
    awarded_at        DATE,
    evidence_media_id BIGINT,             -- FK added after media_assets
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MEDIA ASSETS ---------------------------------------------------
CREATE TABLE media_assets (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id            BIGINT REFERENCES schools(id),  -- null = platform asset
    cloudinary_public_id TEXT NOT NULL,
    url                  TEXT NOT NULL,
    asset_type           TEXT NOT NULL DEFAULT 'image',
    uploaded_by_id       BIGINT NOT NULL REFERENCES users(id),
    visibility           TEXT NOT NULL DEFAULT 'public'
                         CHECK (visibility IN ('public','school_only')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE achievements
    ADD CONSTRAINT fk_achievement_media
    FOREIGN KEY (evidence_media_id) REFERENCES media_assets(id);

-- NOTIFICATIONS ---------------------------------------------------
CREATE TABLE notifications (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id           BIGINT NOT NULL REFERENCES schools(id),
    user_id             BIGINT NOT NULL REFERENCES users(id),
    event_key           TEXT NOT NULL,           -- unique per logical event (idempotency)
    channel             TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','in_app')),
    status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','sent','failed','bounced')),
    provider_message_id TEXT,
    sent_at             TIMESTAMPTZ,
    failure_code        TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, event_key)
);
CREATE INDEX idx_notifications_pending ON notifications(status) WHERE status = 'pending';

-- AUDIT EVENTS ------------------------------------------------------
CREATE TABLE audit_events (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id    BIGINT REFERENCES schools(id),
    actor_id     BIGINT REFERENCES users(id),
    action       TEXT NOT NULL,          -- e.g. 'role_changed', 'article_published'
    entity_type  TEXT NOT NULL,
    entity_id    BIGINT,
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_school_time ON audit_events(school_id, created_at);

-- CONTACT SUBMISSIONS -------------------------------------------------
CREATE TABLE contact_submissions (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    subject     TEXT,
    message     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','handled','spam')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PLATFORM REVIEWERS (platform-level, cross-school) -------------------
-- Reviewers and super-admins are users with a special platform role,
-- kept out of school_memberships on purpose.
CREATE TABLE platform_roles (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    role        TEXT NOT NULL CHECK (role IN ('platform_reviewer','platform_super_admin')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);
