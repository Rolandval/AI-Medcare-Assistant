"""Expo Push Notification service"""

import httpx
from typing import List, Optional


EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push_notification(
    token: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    """Send a single push notification via Expo"""
    if not token or not token.startswith("ExponentPushToken["):
        return False

    message = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "priority": "high",
    }
    if data:
        message["data"] = data

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                EXPO_PUSH_URL,
                json=message,
                headers={"Content-Type": "application/json"},
                timeout=10,
            )
            return resp.status_code == 200
        except Exception:
            return False


async def send_push_notifications_batch(
    messages: List[dict],
) -> int:
    """Send batch of push notifications. Returns count of successful sends."""
    if not messages:
        return 0

    valid = [m for m in messages if m.get("to", "").startswith("ExponentPushToken[")]
    if not valid:
        return 0

    for msg in valid:
        msg.setdefault("sound", "default")
        msg.setdefault("priority", "high")

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                EXPO_PUSH_URL,
                json=valid,
                headers={"Content-Type": "application/json"},
                timeout=30,
            )
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                return sum(1 for d in data if d.get("status") == "ok")
        except Exception:
            pass
    return 0
