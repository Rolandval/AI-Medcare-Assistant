"""Main API v1 router"""

from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.documents import router as documents_router
from app.api.v1.endpoints.meals import router as meals_router
from app.api.v1.endpoints.family import router as family_router
from app.api.v1.endpoints.ai import router as ai_router
from app.api.v1.endpoints.telegram_webhook import router as webhook_router
from app.api.v1.endpoints.telegram_link import router as telegram_router
from app.api.v1.endpoints.notifications import router as notifications_router
from app.api.v1.endpoints.feed import router as feed_router
from app.api.v1.endpoints.ai_chat import router as ai_chat_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(health_router)
api_router.include_router(documents_router)
api_router.include_router(meals_router)
api_router.include_router(family_router)
api_router.include_router(ai_router)
api_router.include_router(webhook_router)
api_router.include_router(telegram_router)
api_router.include_router(notifications_router)
api_router.include_router(feed_router)
api_router.include_router(ai_chat_router)
