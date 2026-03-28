"""Push notification & medication reminder endpoints"""

import uuid
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import DB, CurrentUser
from app.models.user import User
from app.models.medication_reminder import MedicationReminder

router = APIRouter(prefix="/notifications", tags=["notifications"])


# --- Schemas ---

class PushTokenRequest(BaseModel):
    expo_push_token: str


class ReminderCreate(BaseModel):
    name: str
    dosage: Optional[str] = None
    instructions: Optional[str] = None
    times: List[str]  # ["08:00", "14:00"]
    days_of_week: List[int] = [0, 1, 2, 3, 4, 5, 6]  # 0=Mon, 6=Sun
    emoji: Optional[str] = "💊"


class ReminderUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    instructions: Optional[str] = None
    times: Optional[List[str]] = None
    days_of_week: Optional[List[int]] = None
    is_active: Optional[bool] = None
    emoji: Optional[str] = None


class ReminderResponse(BaseModel):
    id: uuid.UUID
    name: str
    dosage: Optional[str]
    instructions: Optional[str]
    times: list
    days_of_week: list
    is_active: bool
    emoji: Optional[str]
    created_at: str

    model_config = {"from_attributes": True}


# --- Push Token ---

@router.post("/push-token")
async def register_push_token(
    body: PushTokenRequest,
    current_user: CurrentUser,
    db: DB,
):
    """Register Expo push token for current user"""
    if not body.expo_push_token.startswith("ExponentPushToken["):
        raise HTTPException(status_code=400, detail="Invalid Expo push token format")

    current_user.expo_push_token = body.expo_push_token
    await db.commit()
    return {"status": "ok"}


@router.delete("/push-token")
async def remove_push_token(current_user: CurrentUser, db: DB):
    """Remove push token (disable push notifications)"""
    current_user.expo_push_token = None
    await db.commit()
    return {"status": "ok"}


# --- Test Push ---

@router.post("/test-push")
async def test_push(current_user: CurrentUser):
    """Send a test push notification"""
    if not current_user.expo_push_token:
        raise HTTPException(status_code=400, detail="No push token registered")

    from app.services.push_notifications import send_push_notification
    success = await send_push_notification(
        token=current_user.expo_push_token,
        title="🔔 Тестове сповіщення",
        body="Push-нотифікації працюють!",
        data={"type": "test"},
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send push notification")
    return {"status": "sent"}


# --- Medication Reminders CRUD ---

@router.post("/reminders", status_code=201)
async def create_reminder(
    body: ReminderCreate,
    current_user: CurrentUser,
    db: DB,
):
    """Create a new medication reminder"""
    reminder = MedicationReminder(
        user_id=current_user.id,
        name=body.name,
        dosage=body.dosage,
        instructions=body.instructions,
        times=body.times,
        days_of_week=body.days_of_week,
        emoji=body.emoji or "💊",
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.get("/reminders")
async def list_reminders(current_user: CurrentUser, db: DB):
    """Get all medication reminders for current user"""
    result = await db.execute(
        select(MedicationReminder)
        .where(MedicationReminder.user_id == current_user.id)
        .order_by(MedicationReminder.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/reminders/{reminder_id}")
async def update_reminder(
    reminder_id: uuid.UUID,
    body: ReminderUpdate,
    current_user: CurrentUser,
    db: DB,
):
    """Update a medication reminder"""
    result = await db.execute(
        select(MedicationReminder).where(
            MedicationReminder.id == reminder_id,
            MedicationReminder.user_id == current_user.id,
        )
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(reminder, field, value)

    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.delete("/reminders/{reminder_id}")
async def delete_reminder(
    reminder_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
):
    """Delete a medication reminder"""
    result = await db.execute(
        select(MedicationReminder).where(
            MedicationReminder.id == reminder_id,
            MedicationReminder.user_id == current_user.id,
        )
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    await db.delete(reminder)
    await db.commit()
    return {"status": "deleted"}
