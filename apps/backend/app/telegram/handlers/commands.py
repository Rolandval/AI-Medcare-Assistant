"""Telegram command handlers + reply keyboard text handlers"""

import logging
from aiogram import Router, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message

from app.telegram.keyboards import main_menu_keyboard

logger = logging.getLogger(__name__)

router = Router()


# ---- Slash commands ----

@router.message(CommandStart())
async def cmd_start(message: Message):
    await message.answer(
        f"👋 Привіт, {message.from_user.first_name}!\n\n"
        "Я — *AI-Medcare-Assistant*, твій персональний лікар 🩺\n\n"
        "Я буду:\n"
        "• 🌅 Запитувати як ти зранку та ввечері\n"
        "• 🍽 Аналізувати твоє харчування по фото\n"
        "• 📋 Складати меню для сім'ї на тиждень\n"
        "• 💡 Давати рекомендації від команди AI-лікарів\n"
        "• 📏 Записувати показники здоров'я\n\n"
        "Для початку потрібно зв'язати цей аккаунт з додатком.\n"
        "Відкрий додаток та введи свій Telegram ID: `" + str(message.from_user.id) + "`\n\n"
        "📌 Команди:\n"
        "/stats — мої показники\n"
        "/log — записати метрику\n"
        "/advice — AI-порада\n"
        "/menu — меню тижня\n"
        "/shop — список закупок\n"
        "/family — сім'я\n"
        "/help — допомога",
        parse_mode="Markdown",
        reply_markup=main_menu_keyboard(),
    )


@router.message(Command("help"))
async def cmd_help(message: Message):
    await message.answer(
        "📌 *Доступні команди:*\n\n"
        "/stats — Мої показники здоров'я\n"
        "/log — Записати метрику (вага, тиск, пульс...)\n"
        "/advice — Отримати AI-рекомендацію\n"
        "/menu — Меню сім'ї на тиждень\n"
        "/shop — Список закупок\n"
        "/family — Стан здоров'я сім'ї\n"
        "/today — Їжа за сьогодні\n\n"
        "📸 *Надішли фото* — я розпізнаю їжу або аналіз\n"
        "📄 *Надішли PDF* — я проаналізую медичний документ\n"
        "📏 *Надішли текст* з показником (напр. \"вага 75\") — запишу",
        parse_mode="Markdown",
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


@router.message(Command("today"))
async def cmd_today(message: Message):
    from app.telegram.utils import get_user_by_telegram_id, format_meals_today
    user = await get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Акаунт не прив'язано.")
        return

    text = await format_meals_today(user)
    await message.answer(text, parse_mode="Markdown")


# ---- Reply keyboard text handlers (main menu buttons) ----

@router.message(F.text == "📊 Мій стан")
async def text_stats(message: Message):
    await cmd_stats(message)


@router.message(F.text == "🍽 Їжа сьогодні")
async def text_meals_today(message: Message):
    await cmd_today(message)


@router.message(F.text == "📋 Меню тижня")
async def text_menu(message: Message):
    await cmd_menu(message)


@router.message(F.text == "🛒 Список закупок")
async def text_shop(message: Message):
    await cmd_shop(message)


@router.message(F.text == "💡 Порада зараз")
async def text_advice(message: Message):
    await cmd_advice(message)


@router.message(F.text == "👨‍👩‍👧‍👦 Сім'я")
async def text_family(message: Message):
    await cmd_family(message)
