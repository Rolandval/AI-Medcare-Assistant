"""AI Feed endpoints — cards, actions, doctors"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import select, update

from app.api.deps import DB, CurrentUser
from app.models.ai_card import AICard
from app.services.ai_doctors import get_all_doctors, get_doctor, DOCTORS

router = APIRouter(prefix="/ai/feed", tags=["ai-feed"])


# ---- Schemas ----

class CardResponse(BaseModel):
    id: uuid.UUID
    doctor_id: str
    doctor_name: str
    doctor_emoji: str
    doctor_color: str
    card_type: str
    round_type: str
    title: str
    body: str
    metadata: Optional[dict] = None
    action_type: Optional[str] = None
    status: str
    created_at: datetime
    acted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CardActionRequest(BaseModel):
    action: str  # done, dismiss, remind, survey_submit
    data: Optional[dict] = None  # For survey_submit: {"mood": "🙂", "energy": 7, "sleep_hours": 7.5}


class DoctorResponse(BaseModel):
    id: str
    name: str
    specialty: str
    emoji: str
    color: str
    personality: str
    motto: str
    card_count: int = 0


# ---- Endpoints ----

@router.get("", response_model=List[CardResponse])
async def get_feed(
    current_user: CurrentUser,
    db: DB,
    limit: int = Query(20, le=50),
    offset: int = Query(0),
    round_type: Optional[str] = Query(None),
):
    """Get AI feed cards for current user, newest first"""
    query = (
        select(AICard)
        .where(AICard.user_id == current_user.id)
    )
    if round_type:
        query = query.where(AICard.round_type == round_type)

    query = query.order_by(AICard.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    cards = result.scalars().all()

    # Mark unseen cards as seen
    unseen_ids = [c.id for c in cards if c.status == "pending"]
    if unseen_ids:
        await db.execute(
            update(AICard)
            .where(AICard.id.in_(unseen_ids))
            .values(status="seen")
        )
        await db.commit()

    response = []
    for card in cards:
        doc = DOCTORS.get(card.doctor_id, DOCTORS["therapist"])
        response.append(CardResponse(
            id=card.id,
            doctor_id=card.doctor_id,
            doctor_name=doc["name"],
            doctor_emoji=doc["emoji"],
            doctor_color=doc["color"],
            card_type=card.card_type,
            round_type=card.round_type,
            title=card.title,
            body=card.body,
            metadata=card.metadata,
            action_type=card.action_type,
            status=card.status,
            created_at=card.created_at,
            acted_at=card.acted_at,
        ))

    return response


@router.post("/{card_id}/action")
async def act_on_card(
    card_id: uuid.UUID,
    body: CardActionRequest,
    current_user: CurrentUser,
    db: DB,
):
    """Record user action on a card"""
    result = await db.execute(
        select(AICard).where(
            AICard.id == card_id,
            AICard.user_id == current_user.id,
        )
    )
    card = result.scalar_one_or_none()
    if not card:
        return {"error": "Card not found"}

    now = datetime.now(timezone.utc)

    if body.action == "done":
        card.status = "acted"
        card.acted_at = now
    elif body.action == "dismiss":
        card.status = "dismissed"
        card.acted_at = now
    elif body.action == "survey_submit":
        card.status = "acted"
        card.acted_at = now
        # Save survey data in card metadata
        card.metadata = {**(card.metadata or {}), "response": body.data}
        # Also create a daily survey from embedded data
        if body.data:
            await _save_embedded_survey(db, current_user.id, body.data)
    elif body.action == "remind":
        card.status = "pending"  # Keep as pending for later

    await db.commit()
    return {"ok": True, "status": card.status}


async def _save_embedded_survey(db, user_id: uuid.UUID, data: dict):
    """Save embedded survey card response as a DailySurvey"""
    from app.models.daily_survey import DailySurvey

    mood_map = {"😫": "terrible", "😟": "bad", "😐": "neutral", "🙂": "good", "😄": "great"}

    survey = DailySurvey(
        user_id=user_id,
        survey_type="morning",
        survey_date=datetime.now(timezone.utc),
        mood=mood_map.get(data.get("mood"), data.get("mood")),
        wellbeing_score=data.get("energy"),
        energy_level=data.get("energy"),
        sleep_hours=data.get("sleep_hours"),
    )
    db.add(survey)
    await db.commit()


@router.get("/doctors", response_model=List[DoctorResponse])
async def list_doctors(current_user: CurrentUser, db: DB):
    """List all AI doctors with card counts"""
    doctors = get_all_doctors()

    # Get card counts per doctor
    from sqlalchemy import func
    counts_result = await db.execute(
        select(AICard.doctor_id, func.count(AICard.id))
        .where(AICard.user_id == current_user.id)
        .group_by(AICard.doctor_id)
    )
    counts = dict(counts_result.all())

    return [
        DoctorResponse(
            id=d["id"],
            name=d["name"],
            specialty=d["specialty"],
            emoji=d["emoji"],
            color=d["color"],
            personality=d["personality"],
            motto=d["motto"],
            card_count=counts.get(d["id"], 0),
        )
        for d in doctors
    ]


@router.post("/generate")
async def generate_round_now(
    current_user: CurrentUser,
    round_type: str = Query("morning"),
):
    """Manually trigger a round generation (for testing)"""
    from app.tasks.feed_tasks import generate_round_for_user
    generate_round_for_user.delay(str(current_user.id), round_type)
    return {"message": f"{round_type} round generation started. Cards will appear in 15-30 seconds."}
