"""Expo Push Notification service"""

import logging
import httpx
from typing import List, Optional


logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push_notification(
    token: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    """Send a single push notification via Expo"""
    if not token or not token.startswith("ExponentPushToken["):
        logger.warning("Invalid push token: %s", token[:20] if token else "None")
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
            if resp.status_code != 200:
                logger.error("Push notification failed: HTTP %d — %s", resp.status_code, resp.text[:200])
                return False
            return True
        except httpx.TimeoutException:
            logger.error("Push notification timed out for token %s", token[:30])
            return False
        except Exception as e:
            logger.exception("Push notification error: %s", e)
            return False


async def send_push_notifications_batch(
    messages: List[dict],
) -> int:
    """Send batch of push notifications. Returns count of successful sends."""
    if not messages:
        return 0

    valid = [m for m in messages if m.get("to", "").startswith("ExponentPushToken[")]
    if not valid:
        logger.info("No valid push tokens in batch of %d messages", len(messages))
        return 0

    for msg in valid:
        msg.setdefault("sound", "default")
        msg.setdefault("priority", "high")

    logger.info("Sending batch of %d push notifications", len(valid))

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
                ok_count = sum(1 for d in data if d.get("status") == "ok")
                failed = [d for d in data if d.get("status") != "ok"]
                if failed:
                    logger.warning("Push batch: %d ok, %d failed. First error: %s", ok_count, len(failed), failed[0])
                else:
                    logger.info("Push batch: all %d sent successfully", ok_count)
                return ok_count
            else:
                logger.error("Push batch failed: HTTP %d — %s", resp.status_code, resp.text[:200])
        except httpx.TimeoutException:
            logger.error("Push batch timed out for %d messages", len(valid))
        except Exception as e:
            logger.exception("Push batch error: %s", e)
    return 0
