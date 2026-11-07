"""EduRise Virtual Competitions.

Government-run inter-school tournaments hosted virtually on EduRise.
Two categories — secondary and university. Rounds per track (Science,
Commercial, Art). Questions are AI-generated per attempt; marking is
instant and server-side; the leaderboard updates in real time.

Privacy (NDPA 2023): no student names or personal data are stored.
Scores belong to schools, not individuals.
"""
import json
import os
import re
from types import SimpleNamespace
from datetime import datetime

import requests
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.membership import get_auth, get_current_user
from app.core.security import create_session_token, read_session_token, SESSION_MAX_AGE
from app.models.tenancy import School
from app.models.people import User
from app.core.config import get_settings

router = APIRouter(prefix="/competitions", tags=["competitions"])

TRACKS = {
    "science": ["Maths", "Physics", "Chemistry", "Biology", "Further Maths", "Digital Tech"],
    "commercial": ["Commerce", "Marketing", "Financial Accounting", "Economics"],
    "art": ["Literature-in-English", "Government", "History", "CRS"],
}
QUESTIONS_PER_ROUND = 5
POINTS_PER_QUESTION = 10
SECONDS_PER_QUESTION = 25
LEVELS = {"secondary": "secondary", "university": "university", "tertiary": "university"}

settings = get_settings()


# ------------------------------------------------------------------ helpers
def _organizer_emails():
    raw = os.getenv("COMP_ORGANIZER_EMAILS", "edidiongorok727@gmail.com")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def _is_organizer(db: Session, user: User) -> bool:
    if user is None or user.status != "active":
        return False
    if user.email.lower() in _organizer_emails():
        return True
    row = db.execute(
        text("SELECT 1 FROM platform_roles WHERE user_id = :u AND role IN ('platform_super_admin','platform_reviewer')")
        , {"u": user.id}
    ).first()
    return row is not None


def _ai_questions(category: str, track: str):
    """Generate a round of MCQs via the platform's AI tutor provider."""
    api_key = os.getenv("COMP_API_KEY") or os.getenv("TUTOR_API_KEY", "")
    api_url = os.getenv("COMP_API_URL") or os.getenv("TUTOR_API_URL", "https://api.x.ai/v1/chat/completions")
    model = os.getenv("COMP_MODEL") or os.getenv("TUTOR_MODEL", "grok-3-mini")
    if not api_key:
        raise HTTPException(status_code=503, detail="Competition question service is not configured yet.")

    level = (
        "Nigerian secondary school students (WAEC / SS3 level)"
        if category == "secondary"
        else "Nigerian university undergraduates (quiz-bowl level, 100-200 level general knowledge)"
    )
    prompt = (
        f"Generate {QUESTIONS_PER_ROUND} multiple-choice competition questions for {level}, "
        f"on the {track} track covering subjects like {', '.join(TRACKS[track])}. "
        "Vary difficulty from easy to hard. Nigerian curriculum context where natural. "
        "No questions about any real person's private life. Return STRICT JSON only, no markdown, shape: "
        '{"questions":[{"q":"question text","options":["A","B","C","D"],"answer":0,"explanation":"1-2 sentence explanation"}]} '
        "where answer is the 0-based index of the single correct option."
    )
    try:
        r = requests.post(
            api_url,
            headers={"Authorization": "Bearer " + api_key, "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.8,
                "max_tokens": 1600,
            },
            timeout=45,
        )
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
    except Exception:
        raise HTTPException(status_code=502, detail="Could not reach the question service. Try again shortly.")

    m = re.search(r"\{[\s\S]*\}", content)
    try:
        data = json.loads(m.group(0) if m else content)
        qs = data["questions"]
        out = []
        for q in qs[:QUESTIONS_PER_ROUND]:
            opts = [str(o)[:200] for o in q["options"]]
            ans = int(q["answer"])
            if len(opts) < 2 or ans not in range(len(opts)):
                continue
            out.append({
                "q": str(q["q"])[:500],
                "options": opts[:4] if len(opts) >= 4 else opts + ["", "", "", ""][:4 - len(opts)],
                "answer": ans if ans < 4 else 0,
                "explanation": str(q.get("explanation", ""))[:400],
            })
        if len(out) < QUESTIONS_PER_ROUND:
            raise ValueError
        return out
    except Exception:
        raise HTTPException(status_code=502, detail="The question service returned a bad set. Try again.")


def _school_level(db: Session, school_id: int) -> str:
    row = db.execute(
        text("SELECT COALESCE(institution_level,'secondary') AS lvl FROM schools WHERE id = :id"),
        {"id": school_id},
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="School not found")
    return LEVELS.get(row.lvl, "secondary")


def _tournament_or_404(db: Session, tid: int):
    t = db.execute(text(
        "SELECT id, name, category, description, organizer_name, status, "
        "starts_at, ends_at, created_at FROM tournaments WHERE id = :id"), {"id": tid}).first()
    if t is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return t


# ------------------------------------------------------------------ models
class TournamentCreate(BaseModel):
    name: str = Field(min_length=3, max_length=140)
    category: str = Field(pattern="^(secondary|university)$")
    description: str | None = Field(default=None, max_length=600)
    organizer_name: str = Field(default="Zone Education Office", max_length=140)
    starts_at: str | None = None
    ends_at: str | None = None


class StatusChange(BaseModel):
    status: str = Field(pattern="^(live|ended)$")


class StartRound(BaseModel):
    track: str = Field(pattern="^(science|commercial|art)$")


class SubmitAnswers(BaseModel):
    answers: list[int] = Field(min_length=0, max_length=QUESTIONS_PER_ROUND)


# ------------------------------------------------------------------ public
@router.get("/whoami")
def competitions_whoami(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Frontend uses this to know if the create-tournament panel should show."""
    return {
        "signed_in": True,
        "is_organizer": _is_organizer(db, user),
    }


@router.get("/tournaments")
def list_tournaments(category: str = "secondary", db: Session = Depends(get_db)):
    if category not in ("secondary", "university"):
        raise HTTPException(status_code=400, detail="category must be secondary or university")
    rows = db.execute(text(
        "SELECT t.id, t.name, t.category, t.description, t.organizer_name, t.status, "
        "t.starts_at, t.ends_at, "
        "(SELECT COUNT(*) FROM tournament_teams tt WHERE tt.tournament_id = t.id) AS teams, "
        "(SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.tournament_id = t.id AND qa.finished_at IS NOT NULL) AS attempts "
        "FROM tournaments t WHERE t.category = :cat ORDER BY (t.status = 'live') DESC, t.created_at DESC LIMIT 50"),
        {"cat": category}).mappings().all()
    return {"tournaments": [dict(r) for r in rows]}


@router.get("/tournaments/{tid}")
def tournament_detail(tid: int, db: Session = Depends(get_db)):
    t = _tournament_or_404(db, tid)
    d = dict(t._mapping)
    return d


@router.get("/tournaments/{tid}/leaderboard")
def leaderboard(tid: int, db: Session = Depends(get_db)):
    _tournament_or_404(db, tid)
    rows = db.execute(text(
        """
        WITH best AS (
            SELECT DISTINCT ON (school_id, track) school_id, track, score, finished_at
            FROM quiz_attempts
            WHERE tournament_id = :t AND finished_at IS NOT NULL
            ORDER BY school_id, track, score DESC, finished_at ASC
        )
        SELECT s.id AS school_id, s.name, s.slug,
               COALESCE(b.sci, 0) AS science,
               COALESCE(b.com, 0) AS commercial,
               COALESCE(b.art, 0) AS art,
               COALESCE(b.sci, 0) + COALESCE(b.com, 0) + COALESCE(b.art, 0) AS total,
               b.last_finish
        FROM schools s
        JOIN tournament_teams te ON te.school_id = s.id AND te.tournament_id = :t
        LEFT JOIN (
            SELECT school_id,
                   MAX(score) FILTER (WHERE track = 'science') AS sci,
                   MAX(score) FILTER (WHERE track = 'commercial') AS com,
                   MAX(score) FILTER (WHERE track = 'art') AS art,
                   MAX(finished_at) AS last_finish
            FROM best GROUP BY school_id
        ) b ON b.school_id = s.id
        ORDER BY COALESCE(b.sci, 0) + COALESCE(b.com, 0) + COALESCE(b.art, 0) DESC,
                 b.last_finish ASC NULLS LAST, s.name ASC
        LIMIT 50
        """), {"t": tid}).mappings().all()
    return {"leaderboard": [dict(r) for r in rows]}


@router.get("/tournaments/{tid}/bracket")
def bracket(tid: int, db: Session = Depends(get_db)):
    """Seeded knockout bracket built from live standings (Zone Cup style).

    Schools are seeded by leaderboard position into a power-of-two bracket.
    Each head-to-head is decided by best total score; byes auto-advance.
    Purely derived data — no extra tables, always consistent with scores.
    """
    _tournament_or_404(db, tid)
    lb = leaderboard(tid, db)["leaderboard"]
    if not lb:
        return {"rounds": [], "champion": None}

    seeds = [{"id": r["school_id"], "name": r["name"], "total": r["total"]} for r in lb]
    slots = 1
    while slots < len(seeds):
        slots *= 2
    if slots < 2:
        slots = 2
    # seed order: 1 v 8, 4 v 5, 3 v 6, 2 v 7 ... (standard bracket seeding)
    seeded = [None] * slots
    order = _bracket_seed_order(slots)
    for pos, seed in enumerate(order):
        if seed - 1 < len(seeds):
            seeded[pos] = seeds[seed - 1]

    rounds = []
    current = seeded
    while len(current) > 1:
        matches = []
        nxt = []
        for i in range(0, len(current), 2):
            a, b = current[i], current[i + 1]
            winner = None
            if a and b:
                winner = a if a["total"] >= b["total"] else b
            elif a:
                winner = a
            elif b:
                winner = b
            matches.append({
                "a": _team_out(a),
                "b": _team_out(b),
                "winner_id": winner["id"] if winner else None,
            })
            nxt.append(winner)
        n = len(current)
        label = "Final" if n == 2 else ("Semi-finals" if n == 4 else "Round of " + str(n))
        rounds.append({"label": label, "matches": matches})
        current = nxt
    champ = seeds[0]["id"]
    if rounds and rounds[-1]["matches"] and rounds[-1]["matches"][0]["winner_id"]:
        champ = rounds[-1]["matches"][0]["winner_id"]
    champion = next((x for x in seeds if x["id"] == champ), None)
    return {"rounds": rounds, "champion": _team_out(champion) if champion else None}


def _team_out(t):
    if not t:
        return None
    return {"id": t["id"], "name": t["name"], "total": t["total"]}


def _bracket_seed_order(slots):
    """Return bracket position -> seed number (1-based), standard knockout order."""
    order = [1, 2]
    while len(order) < slots:
        m = len(order) * 2
        nxt = []
        for x in order:
            nxt += [x, m + 1 - x]
        order = nxt
    return order


# ------------------------------------------------------------------ organizer
@router.post("/tournaments")
def create_tournament(body: TournamentCreate,
                      user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    if not _is_organizer(db, user):
        raise HTTPException(status_code=403, detail="Only the competition organizer (education office) can create tournaments.")
    row = db.execute(text(
        "INSERT INTO tournaments (name, category, description, organizer_name, status, starts_at, ends_at) "
        "VALUES (:n, :c, :d, :o, 'live', :s, :e) RETURNING id, name, category, status"),
        {"n": body.name, "c": body.category, "d": body.description,
         "o": body.organizer_name,
         "s": (body.starts_at or None), "e": (body.ends_at or None)}).first()
    db.commit()
    return {"id": row.id, "name": row.name, "category": row.category, "status": row.status}


@router.post("/tournaments/{tid}/status")
def set_tournament_status(tid: int, body: StatusChange,
                          user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    if not _is_organizer(db, user):
        raise HTTPException(status_code=403, detail="Only the organizer can change a tournament.")
    _tournament_or_404(db, tid)
    db.execute(text("UPDATE tournaments SET status = :s WHERE id = :t"), {"s": body.status, "t": tid})
    db.commit()
    return {"id": tid, "status": body.status}


class AdminTournamentEdit(BaseModel):
    tournament_id: int
    description: str | None = None
    name: str | None = None


@router.post("/admin/tournament")
def admin_edit_tournament(request: Request, body: AdminTournamentEdit, db: Session = Depends(get_db)):
    """Owner-only cleanup of tournament text (ADMIN_KEY)."""
    import os as _os, secrets as _secrets
    key = _os.environ.get("ADMIN_KEY", "")
    got = request.headers.get("x-admin-key", "")
    if not key or not _secrets.compare_digest(key, got):
        raise HTTPException(status_code=403, detail="Forbidden")
    _tournament_or_404(db, body.tournament_id)
    if body.name:
        db.execute(text("UPDATE tournaments SET name = :n WHERE id = :t"), {"n": body.name, "t": body.tournament_id})
    if body.description is not None:
        db.execute(text("UPDATE tournaments SET description = :d WHERE id = :t"), {"d": body.description, "t": body.tournament_id})
    db.commit()
    return {"ok": True}


# ------------------------------------------------------------------ student play
STUDENT_COOKIE = "scp_student"


def _student_payload(request: Request):
    tok = request.cookies.get(STUDENT_COOKIE)
    if not tok:
        return None
    try:
        return read_session_token(tok)
    except Exception:
        return None


def play_ctx(request: Request, db: Session = Depends(get_db)):
    """Who is playing: school staff (full session) OR a student who picked
    their school (no account, no personal data — NDPA-friendly)."""
    try:
        return get_auth(request, db)
    except HTTPException:
        p = _student_payload(request)
        if p and p.get("student_school_id"):
            school = db.get(School, p["student_school_id"])
            if school and school.status == "active":
                return SimpleNamespace(school_id=school.id, user=None, is_student=True)
        raise HTTPException(status_code=403, detail="Sign in with your school Google account, or pick your school as a student.")


class StudentSession(BaseModel):
    school_id: int


@router.get("/student/schools")
def student_schools(db: Session = Depends(get_db)):
    """Verified schools a student can compete for."""
    rows = db.execute(text(
        "SELECT id, name, institution_level FROM schools WHERE status = 'active' ORDER BY name"
    )).mappings().all()
    return {"schools": [dict(r) for r in rows]}


@router.post("/student/session")
def student_session(body: StudentSession, request: Request, response: Response, db: Session = Depends(get_db)):
    school = db.get(School, body.school_id)
    if not school or school.status != "active":
        raise HTTPException(status_code=404, detail="That school is not available.")
    tok = create_session_token({"student_school_id": school.id})
    response.set_cookie(
        STUDENT_COOKIE, tok, httponly=True, samesite="lax",
        secure=request.url.scheme == "https", max_age=30 * 24 * 3600,
    )
    return {"ok": True, "school_id": school.id, "school_name": school.name}


@router.get("/student/me")
def student_me(request: Request, db: Session = Depends(get_db)):
    p = _student_payload(request)
    if not p or not p.get("student_school_id"):
        return {"school_id": None, "school_name": None}
    school = db.get(School, p["student_school_id"])
    if not school or school.status != "active":
        return {"school_id": None, "school_name": None}
    return {"school_id": school.id, "school_name": school.name}


@router.post("/student/signout")
def student_signout(response: Response):
    response.delete_cookie(STUDENT_COOKIE)
    return {"ok": True}


# ------------------------------------------------------------------ school team
@router.post("/tournaments/{tid}/join")
def join_tournament(tid: int, ctx=Depends(play_ctx), db: Session = Depends(get_db)):
    t = _tournament_or_404(db, tid)
    if t.status != "live":
        raise HTTPException(status_code=400, detail="This tournament is not accepting entries.")
    if _school_level(db, ctx.school_id) != t.category:
        want = "secondary schools" if t.category == "secondary" else "universities and tertiary institutions"
        raise HTTPException(status_code=400, detail=f"This tournament is for {want}.")
    exists = db.execute(text(
        "SELECT 1 FROM tournament_teams WHERE tournament_id = :t AND school_id = :s"),
        {"t": tid, "s": ctx.school_id}).first()
    if exists:
        return {"joined": True, "already": True}
    db.execute(text(
        "INSERT INTO tournament_teams (tournament_id, school_id) VALUES (:t, :s)"),
        {"t": tid, "s": ctx.school_id})
    db.commit()
    return {"joined": True, "already": False}


@router.get("/tournaments/{tid}/me")
def my_tournament_state(tid: int, ctx=Depends(play_ctx), db: Session = Depends(get_db)):
    """Is my school in? Which tracks have we attempted?"""
    joined = db.execute(text(
        "SELECT 1 FROM tournament_teams WHERE tournament_id = :t AND school_id = :s"),
        {"t": tid, "s": ctx.school_id}).first() is not None
    best = db.execute(text(
        "SELECT track, MAX(score) AS best FROM quiz_attempts "
        "WHERE tournament_id = :t AND school_id = :s AND finished_at IS NOT NULL GROUP BY track"),
        {"t": tid, "s": ctx.school_id}).mappings().all()
    return {
        "joined": joined,
        "school_id": ctx.school_id,
        "best": {r["track"]: r["best"] for r in best},
    }


# ------------------------------------------------------------------ quiz round
@router.post("/tournaments/{tid}/round/start")
def start_round(tid: int, body: StartRound, ctx=Depends(play_ctx), db: Session = Depends(get_db)):
    t = _tournament_or_404(db, tid)
    if t.status != "live":
        raise HTTPException(status_code=400, detail="This tournament has ended.")
    joined = db.execute(text(
        "SELECT 1 FROM tournament_teams WHERE tournament_id = :t AND school_id = :s"),
        {"t": tid, "s": ctx.school_id}).first()
    if not joined:
        raise HTTPException(status_code=403, detail="Join this tournament first.")

    questions = _ai_questions(t.category, body.track)
    payload = json.dumps({"questions": questions})
    row = db.execute(text(
        "INSERT INTO quiz_attempts (tournament_id, school_id, user_id, track, category, questions_json, max_score) "
        "VALUES (:t, :s, :u, :tr, :c, :qs, :m) RETURNING id"),
        {"t": tid, "s": ctx.school_id, "u": (ctx.user.id if getattr(ctx, "user", None) else None), "tr": body.track,
         "c": t.category, "qs": payload, "m": QUESTIONS_PER_ROUND * POINTS_PER_QUESTION}).first()
    db.commit()

    public = [{"q": q["q"], "options": q["options"]} for q in questions]
    return {
        "attempt_id": row.id,
        "track": body.track,
        "seconds_per_question": SECONDS_PER_QUESTION,
        "questions": public,
    }


@router.post("/rounds/{attempt_id}/submit")
def submit_round(attempt_id: int, body: SubmitAnswers, ctx=Depends(play_ctx), db: Session = Depends(get_db)):
    row = db.execute(text(
        "SELECT id, tournament_id, school_id, user_id, track, questions_json, finished_at, max_score "
        "FROM quiz_attempts WHERE id = :id"), {"id": attempt_id}).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if row.school_id != ctx.school_id:
        raise HTTPException(status_code=403, detail="This round belongs to another school.")
    if row.finished_at is not None:
        raise HTTPException(status_code=409, detail="This round was already submitted.")

    qs = json.loads(row.questions_json)["questions"]
    score = 0
    review = []
    for i, q in enumerate(qs):
        given = body.answers[i] if i < len(body.answers) else -1
        correct = given == q["answer"]
        if correct:
            score += POINTS_PER_QUESTION
        review.append({
            "q": q["q"], "options": q["options"], "answer": q["answer"],
            "given": given, "correct": correct, "explanation": q.get("explanation", ""),
        })
    db.execute(text(
        "UPDATE quiz_attempts SET answers_json = :a, score = :s, finished_at = :f WHERE id = :id"),
        {"a": json.dumps(body.answers), "s": score, "f": datetime.utcnow(), "id": attempt_id})
    db.commit()

    total = score
    max_score = row.max_score
    best_before = db.execute(text(
        "SELECT MAX(score) FROM quiz_attempts WHERE tournament_id = :t AND school_id = :s "
        "AND track = :tr AND finished_at IS NOT NULL AND id != :id"),
        {"t": row.tournament_id, "s": ctx.school_id, "tr": row.track, "id": attempt_id}).scalar() or 0
    return {
        "track": row.track, "score": total, "max_score": max_score,
        "school_best": max(best_before, total), "new_record": total > best_before,
        "review": review,
    }
