# Data Model — v0.1

Companion to `backend/app/db/migrations/001_initial_schema.sql`. Blueprint section 12 + Community Layer Spec v0.2 combined.

## Tenant isolation (the one rule that matters)

Every school-owned table carries `school_id`. The API must resolve the signed-in user's active school membership on every request and filter by that `school_id`. Cross-tenant access is a security bug, covered by automated tests.

## Core flow (who gets in)

1. `school_registration_requests` — a representative submits a school (no tenant yet).
2. A user with a `platform_roles` entry (`platform_reviewer`) approves it.
3. Approval creates a `schools` row + `school_profiles` row; the registrant gets a `school_memberships` row with role `school_admin`.
4. The school admin invites staff → `users` (status `invited`) → staff sign in with Google (`google_subject`) → membership becomes `active`.

Google authenticates. `school_memberships` authorizes. Neither alone is enough.

## Groups of tables

1. Zone and tenancy: `zones`, `schools`, `school_registration_requests`, `platform_roles`
2. People: `users`, `school_memberships`, `teams`
3. Staff workspace: `tasks`, `task_comments`, `goals`
4. Publishing: `articles`, `article_sources`, `article_revisions`, `announcements`
5. Community layer: `school_profiles`, `community_metrics`, `school_events`, `achievements`
6. Platform: `media_assets`, `notifications`, `audit_events`, `contact_submissions`

## Key decisions

- Goal completion is not a typed percentage: `goals.status` must move to `completed` via review, per blueprint 5.2.
- `notifications.event_key` + UNIQUE(user_id, event_key) makes retries idempotent (blueprint risk table).
- `community_metrics` stores school-level aggregates only. Individual WAEC/JAMB results are never stored in the first release.
- Timestamps are TIMESTAMPTZ (UTC in DB, converted at display). Dates (term/academic periods) use DATE.
- `platform_roles` is separate from `school_memberships` so cross-school reviewers never need a fake membership row.
- All times in `created_at/updated_at` default to now(); the ORM/DB triggers keep `updated_at` current.
