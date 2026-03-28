"""AI Chat endpoints — streaming conversations with AI doctors"""

import uuid
from datetime import datetime, timezone, date
from typing import Optional, List

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import DB, CurrentUser
from app.models.ai_chat_message import AIChatMessage
from app.models.ai_card import AICard
from app.services.ai_doctors import DOCTORS

router = APIRouter(prefix="/ai/chat", tags=["ai-chat"])


# ---- Schemas ----

class ChatMessageRequest(BaseModel):
    message: str


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    doctor_id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Helpers ----

def _build_chat_system_prompt(doctor_id: str, user_context: str) -> str:
    doc = DOCTORS.get(doctor_id, DOCTORS["therapist"])
    return f"""Ти — {doc['name']}, {doc['specialty'].lower()}.
Характер: {doc['personality']}.
Девіз: "{doc['motto']}".

Ти спілкуєшся українською мовою. Ти частина AI-команди лікарів у мобільному додатку для здоров'я.
Ти маєш доступ до даних пацієнта і знаєш його особисто.
Будь теплим, емпатичним та корисним. Давай конкретні, практичні поради.
Звертайся на "ти" неформально, по-дружньому.
Відповідай коротко — 2-4 речення, не більше.
Якщо потрібна складна відповідь — розбий на прості кроки.
Не вигадуй дані, яких немає. Якщо чогось не знаєш — скажи.

Дані пацієнта:
{user_context}"""


async def _build_user_context(db, user) -> str:
    """Build user health context for chat (async version)"""
    from app.models.health_metric import HealthMetric
    from app.models.daily_survey import DailySurvey
    from app.models.meal import Meal

    ctx = []
    age = None
    if user.birth_date:
        age = date.today().year - user.birth_date.year

    ctx.append(f"Пацієнт: {user.name}")
    if age:
        ctx.append(f"Вік: {age} років")
    if user.gender:
        ctx.append(f"Стать: {user.gender}")
    if user.occupation:
        ctx.append(f"Професія: {user.occupation}")
    if user.lifestyle:
        ctx.append(f"Спосіб життя: {user.lifestyle}")

    hp = user.health_profile
    if hp:
        if hp.height_cm:
            ctx.append(f"Зріст: {hp.height_cm} см")
        if hp.weight_kg:
            ctx.append(f"Вага: {hp.weight_kg} кг")
        if hp.chronic_conditions:
            ctx.append(f"Хронічні хвороби: {', '.join(hp.chronic_conditions)}")
        if hp.allergies:
            ctx.append(f"Алергії: {', '.join(hp.allergies)}")
        if hp.current_medications:
            ctx.append(f"Ліки: {', '.join(hp.current_medications)}")
        if hp.health_goals:
            ctx.append(f"Цілі: {', '.join(hp.health_goals)}")

    # Latest metrics
    metrics_result = await db.execute(
        select(HealthMetric)
        .where(HealthMetric.user_id == user.id)
        .order_by(HealthMetric.recorded_at.desc())
        .limit(20)
    )
    metrics_rows = metrics_result.scalars().all()

    latest = {}
    for m in metrics_rows:
        if m.metric_type not in latest:
            latest[m.metric_type] = {"value": m.value, "unit": m.unit}

    if latest:
        ctx.append("\nПоказники:")
        for mt, d in latest.items():
            ctx.append(f"  {mt}: {d['value']} {d['unit']}")

    # Recent surveys
    surveys_result = await db.execute(
        select(DailySurvey)
        .where(DailySurvey.user_id == user.id)
        .order_by(DailySurvey.survey_date.desc())
        .limit(4)
    )
    surveys = surveys_result.scalars().all()

    if surveys:
        ctx.append("\nОстанні опитування:")
        for s in surveys:
            parts = [f"самопочуття {s.wellbeing_score}/10" if s.wellbeing_score else ""]
            if s.mood:
                parts.append(f"настрій {s.mood}")
            if s.sleep_hours:
                parts.append(f"сон {s.sleep_hours}г")
            if s.stress_level:
                parts.append(f"стрес {s.stress_level}")
            if s.energy_level:
                parts.append(f"енергія {s.energy_level}/10")
            ctx.append(f"  {s.survey_type} {s.survey_date.date()}: {', '.join(p for p in parts if p)}")

    return "\n".join(ctx)


# ---- Endpoints ----

@router.post("/{doctor_id}")
async def send_message(
    doctor_id: str,
    body: ChatMessageRequest,
    current_user: CurrentUser,
    db: DB,
):
    """Send message to AI doctor and get streaming response"""
    import anthropic
    from app.core.config import settings

    if doctor_id not in DOCTORS:
        return {"error": "Doctor not found"}

    # Save user message
    user_msg = AIChatMessage(
        user_id=current_user.id,
        doctor_id=doctor_id,
        role="user",
        content=body.message,
    )
    db.add(user_msg)
    await db.commit()

    # Build context
    user_context = await _build_user_context(db, current_user)
    system_prompt = _build_chat_system_prompt(doctor_id, user_context)

    # Fetch recent chat history (last 20 messages)
    history_result = await db.execute(
        select(AIChatMessage)
        .where(
            AIChatMessage.user_id == current_user.id,
            AIChatMessage.doctor_id == doctor_id,
        )
        .order_by(AIChatMessage.created_at.desc())
        .limit(20)
    )
    history = list(reversed(history_result.scalars().all()))

    # Build messages for Claude
    messages = [
        {"role": msg.role, "content": msg.content}
        for msg in history
    ]

    # Also add recent cards from this doctor as context
    cards_result = await db.execute(
        select(AICard)
        .where(
            AICard.user_id == current_user.id,
            AICard.doctor_id == doctor_id,
        )
        .order_by(AICard.created_at.desc())
        .limit(5)
    )
    recent_cards = cards_result.scalars().all()

    if recent_cards:
        cards_context = "\n".join(
            f"- [{c.card_type}] {c.title}: {c.body} (статус: {c.status})"
            for c in recent_cards
        )
        system_prompt += f"\n\nТвої останні картки для цього пацієнта:\n{cards_context}"

    # Stream response
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def generate():
        full_response = []
        with client.messages.stream(
            model=settings.CLAUDE_MODEL,
            max_tokens=1000,
            system=system_prompt,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                full_response.append(text)
                yield text

        # Save assistant message after streaming completes
        assistant_content = "".join(full_response)
        from sqlalchemy import create_engine
        from sqlalchemy.orm import Session

        sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
        engine = create_engine(sync_url)
        with Session(engine) as sync_db:
            assistant_msg = AIChatMessage(
                user_id=current_user.id,
                doctor_id=doctor_id,
                role="assistant",
                content=assistant_content,
            )
            sync_db.add(assistant_msg)
            sync_db.commit()

    return StreamingResponse(generate(), media_type="text/plain")


@router.post("/{doctor_id}/sync")
async def send_message_sync(
    doctor_id: str,
    body: ChatMessageRequest,
    current_user: CurrentUser,
    db: DB,
):
    """Send message to AI doctor and get non-streaming response (for mobile)"""
    import anthropic
    from app.core.config import settings

    if doctor_id not in DOCTORS:
        return {"error": "Doctor not found"}

    # Save user message
    user_msg = AIChatMessage(
        user_id=current_user.id,
        doctor_id=doctor_id,
        role="user",
        content=body.message,
    )
    db.add(user_msg)
    await db.commit()

    # Build context
    user_context = await _build_user_context(db, current_user)
    system_prompt = _build_chat_system_prompt(doctor_id, user_context)

    # Fetch recent chat history
    history_result = await db.execute(
        select(AIChatMessage)
        .where(
            AIChatMessage.user_id == current_user.id,
            AIChatMessage.doctor_id == doctor_id,
        )
        .order_by(AIChatMessage.created_at.desc())
        .limit(20)
    )
    history = list(reversed(history_result.scalars().all()))

    messages = [
        {"role": msg.role, "content": msg.content}
        for msg in history
    ]

    # Recent cards context
    cards_result = await db.execute(
        select(AICard)
        .where(
            AICard.user_id == current_user.id,
            AICard.doctor_id == doctor_id,
        )
        .order_by(AICard.created_at.desc())
        .limit(5)
    )
    recent_cards = cards_result.scalars().all()

    if recent_cards:
        cards_context = "\n".join(
            f"- [{c.card_type}] {c.title}: {c.body} (статус: {c.status})"
            for c in recent_cards
        )
        system_prompt += f"\n\nТвої останні картки для цього пацієнта:\n{cards_context}"

    # Non-streaming call
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=1000,
        system=system_prompt,
        messages=messages,
    )

    assistant_content = response.content[0].text

    # Save assistant message
    assistant_msg = AIChatMessage(
        user_id=current_user.id,
        doctor_id=doctor_id,
        role="assistant",
        content=assistant_content,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return {
        "id": str(assistant_msg.id),
        "doctor_id": doctor_id,
        "role": "assistant",
        "content": assistant_content,
        "created_at": assistant_msg.created_at.isoformat(),
    }


@router.get("/{doctor_id}/history", response_model=List[ChatMessageResponse])
async def get_chat_history(
    doctor_id: str,
    current_user: CurrentUser,
    db: DB,
    limit: int = Query(50, le=100),
    offset: int = Query(0),
):
    """Get chat history with a specific doctor"""
    result = await db.execute(
        select(AIChatMessage)
        .where(
            AIChatMessage.user_id == current_user.id,
            AIChatMessage.doctor_id == doctor_id,
        )
        .order_by(AIChatMessage.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    messages = result.scalars().all()
    return messages
