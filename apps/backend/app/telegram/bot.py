"""Telegram Bot setup with aiogram 3"""

from app.core.config import settings

# Global bot instance (lazy init)
_bot = None
_dp = None


def get_bot():
    global _bot
    if _bot is None:
        from aiogram import Bot
        _bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
    return _bot


def get_dispatcher():
    global _dp
    if _dp is None:
        from aiogram import Dispatcher
        try:
            from aiogram.fsm.storage.redis import RedisStorage
            storage = RedisStorage.from_url(settings.REDIS_URL)
        except Exception:
            from aiogram.fsm.storage.memory import MemoryStorage
            storage = MemoryStorage()

        _dp = Dispatcher(storage=storage)
        _register_handlers(_dp)
    return _dp


def _register_handlers(dp):
    from app.telegram.handlers import commands, surveys, media
    dp.include_router(commands.router)
    dp.include_router(surveys.router)
    dp.include_router(media.router)


async def setup_webhook():
    bot = get_bot()
    await bot.set_webhook(
        url=settings.TELEGRAM_WEBHOOK_URL,
        secret_token=settings.TELEGRAM_WEBHOOK_SECRET,
        drop_pending_updates=True,
    )


async def process_update(update_data: dict):
    from aiogram.types import Update
    bot = get_bot()
    dp = get_dispatcher()
    update = Update.model_validate(update_data)
    await dp.feed_update(bot, update)
