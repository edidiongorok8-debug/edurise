"""Privacy-friendly internal analytics: aggregate page-view counts only."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])


class PageView(BaseModel):
    path: str = Field(min_length=1, max_length=200)
    honeypot: str = ""  # spam trap: bots that fill it get ignored silently


@router.post("/track", status_code=204)
def track(body: PageView, db=Depends(get_db)):
    if body.honeypot:  # silently drop suspected bot traffic
        return
    db.execute(text(
        "INSERT INTO page_views (path, views) VALUES (:p, 1) "
        "ON CONFLICT (path) DO UPDATE SET views = page_views.views + 1"
    ), {"p": body.path})
    db.commit()
    return


@router.get("/summary")
def summary(db=Depends(get_db)):
    rows = db.execute(text("SELECT path, views FROM page_views ORDER BY views DESC LIMIT 50")).fetchall()
    return [{"path": r[0], "views": r[1]} for r in rows]
