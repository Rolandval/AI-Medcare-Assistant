"""Telegram utility functions — DB queries, formatting"""

from datetime import datetime, timezone
from typing import Optional


async def get_user_by_telegram_id(telegram_id: int):
    """Get user from DB by Telegram ID"""
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.core.database import AsyncSessionLocal
    from app.models.user import User

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.telegram_id == telegram_id))
        return result.scalar_one_or_none()


async def save_survey(user, survey_type: str, data: dict):
    """Save survey results to DB"""
    from app.core.database import AsyncSessionLocal
    from app.models.daily_survey import DailySurvey

    async with AsyncSessionLocal() as db:
        survey = DailySurvey(
            user_id=user.id,
            survey_type=survey_type,
            survey_date=datetime.now(timezone.utc),
            wellbeing_score=data.get("wellbeing_score"),
            mood=data.get("mood"),
            sleep_hours=data.get("sleep_hours"),
            energy_level=data.get("energy_level"),
            stress_level=data.get("stress_level"),
            pain_locations=data.get("pain_locations", []),
            notes=data.get("notes"),
            activity_minutes=data.get("activity_minutes"),
        )
        db.add(survey)
        await db.commit()


async def save_meal_from_telegram(user, file_url: str, message):
    """Save meal from Telegram photo"""
    from app.core.database import AsyncSessionLocal
    from app.models.meal import Meal
    from app.tasks.ai_tasks import recognize_meal_task

    async with AsyncSessionLocal() as db:
        meal = Meal(
            user_id=user.id,
            photo_url=file_url,
            eaten_at=datetime.now(timezone.utc),
            recognition_status="pending",
        )
        db.add(meal)
        await db.commit()
        await db.refresh(meal)

    recognize_meal_task.delay(str(meal.id))
    await message.answer("⏳ Аналізую їжу... Результат за 10-15 сек у додатку.")


async def save_document_from_telegram(user, file_url: str, filename: str, message):
    """Save medical document from Telegram"""
    from app.core.database import AsyncSessionLocal
    from app.models.medical_document import MedicalDocument
    from app.tasks.ai_tasks import process_document_task

    async with AsyncSessionLocal() as db:
        doc = MedicalDocument(
            user_id=user.id,
            doc_type="other",
            title=filename,
            file_url=file_url,
            file_name=filename,
            ocr_status="pending",
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

    process_document_task.delay(str(doc.id))
    await message.answer("⏳ Аналізую документ... Результат за 30-60 сек у додатку.")


async def format_stats(user) -> str:
    """Format user stats for Telegram message"""
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.health_metric import HealthMetric
    from app.models.ai_recommendation import AIRecommendation

    async with AsyncSessionLocal() as db:
        # Latest metrics
        metrics_result = await db.execute(
            select(HealthMetric)
            .where(HealthMetric.user_id == user.id)
            .order_by(HealthMetric.recorded_at.desc())
            .limit(20)
        )
        metrics = metrics_result.scalars().all()

        latest = {}
        for m in metrics:
            if m.metric_type not in latest:
                latest[m.metric_type] = f"{m.value} {m.unit}"

        # Latest recommendation
        rec_result = await db.execute(
            select(AIRecommendation)
            .where(
                AIRecommendation.user_id == user.id,
                AIRecommendation.rec_type == "daily_brief",
            )
            .order_by(AIRecommendation.created_at.desc())
            .limit(1)
        )
        rec = rec_result.scalar_one_or_none()

    lines = [f"📊 *Показники {user.name}*\n"]

    metric_labels = {
        "blood_pressure_systolic": "🫀 Тиск (сист)",
        "blood_pressure_diastolic": "🫀 Тиск (діаст)",
        "heart_rate": "❤️ Пульс",
        "weight": "⚖️ Вага",
        "temperature": "🌡 Температура",
        "blood_glucose": "🩸 Глюкоза",
        "oxygen_saturation": "💨 SpO2",
        "steps": "👟 Кроки",
    }

    for key, label in metric_labels.items():
        if key in latest:
            lines.append(f"{label}: {latest[key]}")

    if rec and rec.content:
        summary = rec.content.get("summary", "")
        if summary:
            lines.append(f"\n💡 *AI-висновок:*\n{summary}")

    return "\n".join(lines)


async def format_weekly_menu(user) -> str:
    """Format weekly family menu"""
    from sqlalchemy import select
    from datetime import date, timedelta
    from app.core.database import AsyncSessionLocal
    from app.models.family_menu import FamilyMenu

    if not user.family_id:
        return "❌ Ти не в сім'ї. Створи або приєднайся до сім'ї в додатку."

    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(FamilyMenu).where(
                FamilyMenu.family_id == user.family_id,
                FamilyMenu.week_start == week_start,
            )
        )
        menu = result.scalar_one_or_none()

    if not menu:
        return "📋 Меню на цей тиждень ще не згенеровано.\nВикористай /menu generate або відкрий додаток."

    days_ua = {"monday": "Пн", "tuesday": "Вт", "wednesday": "Ср",
               "thursday": "Чт", "friday": "Пт", "saturday": "Сб", "sunday": "Нд"}

    lines = ["🍽 *Меню сім'ї на тиждень*\n"]
    for day_en, day_ua in days_ua.items():
        day_menu = menu.menu_data.get(day_en, {})
        if day_menu:
            lines.append(f"*{day_ua}:*")
            for meal_type, meal in day_menu.items():
                emoji = {"breakfast": "🌅", "lunch": "☀️", "dinner": "🌙"}.get(meal_type, "🍽")
                lines.append(f"  {emoji} {meal.get('name', '—')}")

    return "\n".join(lines)


async def format_shopping_list(user) -> str:
    """Format shopping list"""
    from sqlalchemy import select
    from datetime import date, timedelta
    from app.core.database import AsyncSessionLocal
    from app.models.family_menu import FamilyMenu

    if not user.family_id:
        return "❌ Ти не в сім'ї."

    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(FamilyMenu).where(
                FamilyMenu.family_id == user.family_id,
                FamilyMenu.week_start == week_start,
            )
        )
        menu = result.scalar_one_or_none()

    if not menu or not menu.shopping_list:
        return "🛒 Список закупок порожній. Спочатку згенеруй меню."

    category_emoji = {
        "vegetables": "🥦", "meat_fish": "🥩", "dairy": "🥛",
        "grains": "🌾", "fruits": "🍎", "other": "🛒",
    }

    lines = ["🛒 *Список закупок на тиждень*\n"]
    for category, items in menu.shopping_list.items():
        if items:
            emoji = category_emoji.get(category, "📦")
            lines.append(f"{emoji} *{category}:*")
            for item in items:
                lines.append(f"  ☐ {item}")

    return "\n".join(lines)


async def format_family_status(user) -> str:
    """Format family health overview"""
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.family import Family
    from app.models.ai_recommendation import AIRecommendation

    if not user.family_id:
        return "❌ Ти не в сім'ї."

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Family).where(Family.id == user.family_id))
        family = result.scalar_one_or_none()

    lines = [f"👨‍👩‍👧‍👦 *Сім'я {family.name}*\n"]
    for member in family.members:
        score_icon = "🟢"
        lines.append(f"{score_icon} *{member.name}*")

    return "\n".join(lines)


async def send_survey(telegram_id: int, name: str, survey_type: str):
    """Send survey invitation to user"""
    from app.telegram.bot import get_bot
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
    from aiogram.utils.keyboard import InlineKeyboardBuilder

    bot = get_bot()
    builder = InlineKeyboardBuilder()

    if survey_type == "morning":
        text = f"🌅 Доброго ранку, *{name}*!\nЯк ти сьогодні? Пройди швидке опитування (1 хв) 👇"
        builder.row(InlineKeyboardButton(text="✅ Почати опитування", callback_data="start_morning_survey"))
    else:
        text = f"🌙 Добрий вечір, *{name}*!\nПідведемо підсумок дня 👇"
        builder.row(InlineKeyboardButton(text="✅ Почати опитування", callback_data="start_evening_survey"))

    await bot.send_message(
        chat_id=telegram_id,
        text=text,
        reply_markup=builder.as_markup(),
        parse_mode="Markdown",
    )
