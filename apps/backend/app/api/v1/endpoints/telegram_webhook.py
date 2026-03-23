"""Telegram webhook endpoint"""

from fastapi import APIRouter, Request, HTTPException, Header
from typing import Optional

from app.core.config import settings

router = APIRouter(prefix="/webhook", tags=["webhook"])


@router.post("/telegram")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: Optional[str] = Header(None),
):
    if settings.TELEGRAM_WEBHOOK_SECRET:
        if x_telegram_bot_api_secret_token != settings.TELEGRAM_WEBHOOK_SECRET:
            raise HTTPException(status_code=403, detail="Invalid secret token")

    update_data = await request.json()

    from app.telegram.bot import process_update
    await process_update(update_data)

    return {"ok": True}
