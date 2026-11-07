"""EduRise AI Tutor: main tutor with Science/Commercial/Art subject mini-bots.

Privacy rule (blueprint / NDPA 2023): the endpoint never asks for or stores
student names or grades. Chat history is not persisted server-side; the
conversation is held on the student's own device and sent per-request.
"""
import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/tutor", tags=["tutor"])

STREAMS = {
    "science": ["Maths", "Physics", "Chemistry", "Biology", "Digital Tech",
                "Further Maths", "Agric Science", "English", "Civic Education",
                "Technical Drawing", "Geography"],
    "commercial": ["Commerce", "Marketing", "Financial Accounting"],
    "art": ["Literature-in-English", "Civic Education", "Economics", "History",
            "Government", "Maths", "English", "Food & Nutrition", "CRS"],
}

STYLE = (
    "You are EduRise Tutor, a warm, encouraging secondary-school teacher in Nigeria "
    "following the Nigerian WAEC/JAMB curriculum. Teach in the style of an interactive "
    "online course: (1) explain the concept simply in plain language, (2) give one short "
    "concrete example, (3) ask the student ONE short practice question and wait for their "
    "answer before continuing. Keep replies under 150 words unless the student asks for "
    "more depth. Adjust to the student's level from their replies. If they answer, check "
    "it warmly, correct mistakes gently, then move to the next small step. "
    "NEVER ask for the student's real name, school, phone number or any personal data. "
    "If a student volunteers personal data, remind them kindly not to share it."
)


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=2000)


class TutorRequest(BaseModel):
    stream: str
    subject: str
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)


@router.get("/streams")
def streams():
    return STREAMS


@router.post("/chat")
def chat(body: TutorRequest):
    stream = STREAMS.get(body.stream)
    if not stream or body.subject not in stream:
        raise HTTPException(status_code=400, detail="Unknown stream or subject")

    api_key = os.getenv("TUTOR_API_KEY", "")
    api_url = os.getenv("TUTOR_API_URL", "https://api.x.ai/v1/chat/completions")
    model = os.getenv("TUTOR_MODEL", "grok-3-mini")
    if not api_key:
        raise HTTPException(status_code=503, detail="tutor-not-configured")

    system = STYLE + f" You are tutoring {body.subject} in the {body.stream.title()} stream."
    payload = {
        "model": model,
        "temperature": 0.6,
        "max_tokens": 600,
        "messages": [{"role": "system", "content": system}]
        + [{"role": m.role, "content": m.content} for m in body.messages[-16:]],
    }
    try:
        r = requests.post(
            api_url,
            json=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=45,
        )
        r.raise_for_status()
        data = r.json()
        reply = data["choices"][0]["message"]["content"].strip()
        return {"reply": reply}
    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"tutor-provider-error: {r.status_code}")
    except Exception:
        raise HTTPException(status_code=502, detail="tutor-unavailable")
