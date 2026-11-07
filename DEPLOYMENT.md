# Deployment Preparation

Order matters: database first, then auth, then email, then hosting.

## 1. Neon (PostgreSQL database) — DONE 21 Oct 2026

Project: EduRise (still-lake-26012090), branch `production`, region AWS US East 2.
`neon deploy` provisioned Postgres + Neon Auth + Functions; env vars are in `.env.local`
and `DATABASE_URL` is wired into `backend/.env`. The schema (22 tables) has been
applied to the production branch. Note: AI Gateway was removed from neon.ts —
it needs a paid plan and the app doesn't use it.
The sandbox that runs the agent is HTTPS-only (no port 5432), so in-sandbox DB
operations use Neon's SQL-over-HTTPS endpoint; the deployed app connects normally.

Original steps (for reference):

1. Create a project at neon.tech; copy the *pooled* connection string.
2. Put it in `backend/.env` as `DATABASE_URL` (keep `?sslmode=require`).
3. Create the schema once:
   `DATABASE_URL=... python -m alembic upgrade head`
   (or, for a first deployment, run `python -c` with `Base.metadata.create_all(engine)`
   from `app.db.session` — the migration file `db/migrations/0001_init.sql`
   is the canonical reference for the production schema.)

## 2. Google OAuth (staff sign-in) — DONE 21 Oct 2026

Client ID created (project oval-day-451518-m8), wired into backend/.env and
frontend/assets/js/config.js, and verified against Google's OAuth server (client
and redirect URI accepted). Client secret stored in backend/.env (the GIS button
flow doesn't need it; kept for a future server-side code flow). At deployment,
add the real domain to Authorized JavaScript origins.

Original steps (for reference):

1. console.cloud.google.com → create project → OAuth consent screen.
   Set audience to External; add test users during review.
2. Credentials → OAuth client ID → Web application.
   Authorized JavaScript origins: add BOTH the backend domain and the frontend
   domain, e.g. `https://api.your-domain.example` and `https://your-domain.example`.
3. Copy the client ID into `GOOGLE_CLIENT_ID` (backend .env) AND into
   `frontend/assets/js/config.js` (`GOOGLE_CLIENT_ID`) — the frontend renders
   the Google button with it, the backend verifies the credential with it.

## 3. Resend (email: invites, task assignments, reminders)

1. Create an account at resend.com and verify your sending domain
   (add the DKIM/SPF DNS records it shows you).
2. Create an API key → `RESEND_API_KEY` in backend .env.
3. Set `RESEND_FROM_EMAIL` to an address on the verified domain.

## 4. Hosting

Backend (FastAPI):
- Any Python host works (Render, Railway, Fly.io, a VPS).
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Runtime vars: everything in `.env` (set them in the host's dashboard,
  not a committed file).

Frontend (static pages):
- `frontend/pages/` is plain HTML/JS — host it on any static host
  (Netlify, Cloudflare Pages, Vercel, or the same server).
- Before going live, edit `frontend/assets/js/config.js`:
  - `API_BASE` → your deployed API base, e.g. `https://api.your-domain.example/api/v1`
  - `GOOGLE_CLIENT_ID` → the client ID from step 2.
- The backend serves these same pages locally in dev; production serves
  them separately (CORS is already configured via `FRONTEND_ORIGIN`).

## 5. Scheduled job (due-date reminders)

The reminder sweep is serverless-safe and idempotent:
`python -m app.scripts.send_due_reminders`
Schedule it once per day (host cron, Railway scheduled job, GitHub Action, etc.).
Duplicate sends are impossible by design (event-key idempotency).

## 6. Go-live checklist

- [ ] `GET /api/v1/health` returns ok on the deployed URL
- [ ] Google sign-in works from the deployed frontend origin
- [ ] A test school registration → approve → invite staff → staff signs in
- [ ] Invite email lands in inbox (check spam folder; DKIM set in step 3)
- [ ] Cross-school isolation spot check: staff of school A gets 404 for
      school B's task (covered by `tests/test_isolation.py`, re-run in prod DB)
- [ ] Reminder cron fires once and sends at most one email per due task

## Security notes

- Never commit `.env`; only `.env.example`.
- `SESSION_SECRET` must be long and random; rotating it signs everyone out.
- The database is the tenant boundary: every query is school-scoped
  (`services/membership.py`). Do not add an endpoint that queries without it.
