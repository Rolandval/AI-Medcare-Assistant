"""Telegram command handlers"""

from aiogram import Router
from aiogram.filters import CommandStart, Command
from aiogram.types import Message

from app.telegram.keyboards import main_menu_keyboard

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message):
    await message.answer(
        f"👋 Привіт, {message.from_user.first_name}!\n\n"
        "Я — *AI-Medcare-Assistant*, твій персональний лікар 🩺\n\n"
        "Я буду:\n"
        "• 🌅 Запитувати як ти зранку та ввечері\n"
        "• 🍽 Аналізувати твоє харчування по фото\n"
        "• 📋 Складати меню для сім'ї на тиждень\n"
        "• 💡 Давати рекомендації від команди AI-лікарів\n\n"
        "Для початку потрібно зв'язати цей аккаунт з додатком.\n"
        "Відкрий додаток та введи свій Telegram ID: `" + str(message.from_user.id) + "`",
        parse_mode="Markdown",
        reply_markup=main_menu_keyboard(),
    )


@router.message(Command("stats"))
async def cmd_stats(message: Message):
    from app.telegram.utils import get_user_by_telegram_id, format_stats
    user = await get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Акаунт не прив'язано. Використай /start")
        return

    stats = await format_stats(user)
    await message.answer(stats, parse_mode="Markdown")


@router.message(Command("advice"))
async def cmd_advice(message: Message):
    from app.telegram.utils import get_user_by_telegram_id
    user = await get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Акаунт не прив'язано.")
        return

    await message.answer("🤔 Аналізую твій стан... (15-30 сек)")

    from app.tasks.ai_tasks import analyze_health_task
    analyze_health_task.delay(str(user.id))
    await message.answer("✅ Аналіз запущено! Результат з'явиться в додатку та надійде сюди.")


@router.message(Command("menu"))
async def cmd_menu(message: Message):
    from app.telegram.utils import get_user_by_telegram_id, format_weekly_menu
    user = await get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Акаунт не прив'язано.")
        return

    menu_text = await format_weekly_menu(user)
    await message.answer(menu_text, parse_mode="Markdown")


@router.message(Command("shop"))
async def cmd_shop(message: Message):
    from app.telegram.utils import get_user_by_telegram_id, format_shopping_list
    user = await get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Акаунт не прив'язано.")
        return

    shop_text = await format_shopping_list(user)
    await message.answer(shop_text, parse_mode="Markdown")


@router.message(Command("family"))
async def cmd_family(message: Message):
    from app.telegram.utils import get_user_by_telegram_id, format_family_status
    user = await get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Акаунт не прив'язано.")
        return

    family_text = await format_family_status(user)
    await message.answer(family_text, parse_mode="Markdown")
