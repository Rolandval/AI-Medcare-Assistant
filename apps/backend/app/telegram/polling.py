"""
Telegram Bot Polling — для локальної розробки (замість webhook)

Запуск:
    cd apps/backend
    python -m app.telegram.polling
"""

import asyncio
import logging
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.redis import RedisStorage

from app.core.config import settings
from app.telegram.handlers import commands, surveys, media

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    logger.info("Starting Telegram bot in POLLING mode...")

    bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)

    try:
        storage = RedisStorage.from_url(settings.REDIS_URL)
    except Exception:
        from aiogram.fsm.storage.memory import MemoryStorage
        storage = MemoryStorage()
        logger.warning("Redis not available, using MemoryStorage")

    dp = Dispatcher(storage=storage)
    dp.include_router(commands.router)
    dp.include_router(surveys.router)
    dp.include_router(media.router)

    # Delete webhook if set
    await bot.delete_webhook(drop_pending_updates=True)

    logger.info("Bot started. Press Ctrl+C to stop.")
    await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())


if __name__ == "__main__":
    asyncio.run(main())
