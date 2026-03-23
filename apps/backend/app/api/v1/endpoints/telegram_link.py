"""Link Telegram account to user profile"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import DB, CurrentUser
from app.models.user import User

router = APIRouter(prefix="/telegram", tags=["telegram"])


class TelegramLinkRequest(BaseModel):
    telegram_id: int
    telegram_username: str | None = None


@router.post("/link")
async def link_telegram(body: TelegramLinkRequest, current_user: CurrentUser, db: DB):
    """Link Telegram account to current user"""
    # Check if already taken
    result = await db.execute(
        select(User).where(User.telegram_id == body.telegram_id)
    )
    existing = result.scalar_one_or_none()
    if existing and existing.id != current_user.id:
        raise HTTPException(status_code=409, detail="This Telegram account is already linked to another user")

    current_user.telegram_id = body.telegram_id
    current_user.telegram_username = body.telegram_username
    await db.commit()

    return {"message": "Telegram account linked successfully", "telegram_id": body.telegram_id}


@router.delete("/link")
async def unlink_telegram(current_user: CurrentUser, db: DB):
    """Unlink Telegram account"""
    current_user.telegram_id = None
    current_user.telegram_username = None
    await db.commit()
    return {"message": "Telegram account unlinked"}
