"""Telegram utility functions — DB queries, formatting, result callbacks"""

import logging
from datetime import datetime, timezone, date, timedelta
from typing import Optional

logger = logging.getLogger(__name__)


async def get_user_by_telegram_id(telegram_id: int):
    """Get user from DB by Telegram ID"""
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.user import User

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.telegram_id == telegram_id))
        return result.scalar_one_or_none()


async def get_user_by_id(user_id: str):
    """Get user from DB by UUID"""
    from app.core.database import AsyncSessionLocal
    from app.models.user import User

    async with AsyncSessionLocal() as db:
        result = await db.get(User, user_id)
        return result


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
    """Save meal from Telegram photo and trigger recognition"""
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

    # Pass telegram_id so callback can send results
    recognize_meal_task.delay(str(meal.id), telegram_callback_id=user.telegram_id)


async def save_document_from_telegram(user, file_url: str, filename: str, message):
    """Save medical document from Telegram and trigger analysis"""
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

    # Pass telegram_id so callback can send results
    process_document_task.delay(str(doc.id), telegram_callback_id=user.telegram_id)


# ---- Formatting functions ----

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
                latest[m.metric_type] = {"value": m.value, "unit": m.unit, "at": m.recorded_at}

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

    # Build blood pressure composite
    sys_data = latest.get("blood_pressure_systolic")
    dia_data = latest.get("blood_pressure_diastolic")
    if sys_data and dia_data:
        lines.append(f"🫀 Тиск: {int(sys_data['value'])}/{int(dia_data['value'])} мм рт.ст.")

    for key, label in metric_labels.items():
        if key.startswith("blood_pressure"):
            continue  # Already handled
        if key in latest:
            val = latest[key]["value"]
            unit = latest[key]["unit"]
            display = f"{val:.1f}" if val != int(val) else str(int(val))
            lines.append(f"{label}: {display} {unit}")

    if not any(k in latest for k in metric_labels):
        lines.append("📭 Немає записаних показників.\nВикористай /log для запису.")

    if rec and rec.content:
        summary = rec.content.get("summary", "")
        if summary:
            lines.append(f"\n💡 *AI-висновок:*\n{summary}")

    return "\n".join(lines)


async def format_meals_today(user) -> str:
    """Format today's meals summary"""
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.meal import Meal

    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Meal)
            .where(
                Meal.user_id == user.id,
                Meal.eaten_at >= today_start,
            )
            .order_by(Meal.eaten_at.asc())
        )
        meals = result.scalars().all()

    if not meals:
        return "🍽 *Їжа сьогодні*\n\n📭 Записів немає.\nНадішли фото їжі — я проаналізую!"

    meal_type_labels = {
        "breakfast": "🌅 Сніданок",
        "lunch": "☀️ Обід",
        "dinner": "🌙 Вечеря",
        "snack": "🍪 Перекус",
    }

    lines = ["🍽 *Їжа сьогодні*\n"]
    total_cal = 0
    total_p = 0
    total_f = 0
    total_c = 0

    for meal in meals:
        label = meal_type_labels.get(meal.meal_type, "🍽 Прийом їжі")
        cal = meal.calories or 0
        total_cal += cal

        if meal.proteins_g:
            total_p += meal.proteins_g
        if meal.fats_g:
            total_f += meal.fats_g
        if meal.carbs_g:
            total_c += meal.carbs_g

        status_icon = {
            "done": "✅",
            "processing": "⏳",
            "pending": "⏳",
            "failed": "❌",
            "manual": "✏️",
        }.get(meal.recognition_status, "")

        time_str = ""
        if meal.eaten_at:
            time_str = meal.eaten_at.strftime("%H:%M")

        line = f"{status_icon} *{label}*"
        if time_str:
            line += f" ({time_str})"
        if cal:
            line += f" — {int(cal)} ккал"
        lines.append(line)

        # Show food description
        if meal.ai_comment:
            lines.append(f"  _{meal.ai_comment[:80]}_")
        elif meal.description:
            lines.append(f"  {meal.description[:80]}")

    lines.append(f"\n📊 *Всього за день:*")
    lines.append(f"🔥 {int(total_cal)} ккал")
    if total_p or total_f or total_c:
        lines.append(f"🥩 Б: {total_p:.0f}г | 🧈 Ж: {total_f:.0f}г | 🍞 В: {total_c:.0f}г")

    return "\n".join(lines)


async def format_weekly_menu(user) -> str:
    """Format weekly family menu"""
    from sqlalchemy import select
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

    if not user.family_id:
        return "❌ Ти не в сім'ї."

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Family).where(Family.id == user.family_id))
        family = result.scalar_one_or_none()

    if not family:
        return "❌ Сім'ю не знайдено."

    lines = [f"👨‍👩‍👧‍👦 *Сім'я {family.name}*\n"]
    for member in family.members:
        admin = " (адмін)" if member.is_family_admin else ""
        lines.append(f"🟢 *{member.name}*{admin}")

    lines.append(f"\nУсього: {len(family.members)} учасників")
    return "\n".join(lines)


async def send_survey(telegram_id: int, name: str, survey_type: str):
    """Send survey invitation to user"""
    from app.telegram.bot import get_bot
    from aiogram.types import InlineKeyboardButton
    from aiogram.utils.keyboard import InlineKeyboardBuilder

    bot = get_bot()
    builder = InlineKeyboardBuilder()

    if survey_type == "morning":
        text = f"🌅 Доброго ранку, *{name}*!\nЯк ти сьогодні? Пройди швидке опитування (1 хв) 👇"
        builder.row(InlineKeyboardButton(text="✅ Почати опитування", callback_data="start_morning_survey"))
    else:
        text = f"🌙 Добрий вечір, *{name}*!\nПідведемо підсумок дня 👇"
        builder.row(InlineKeyboardButton(text="✅ Почати опитування", callback_data="start_evening_survey"))

    try:
        await bot.send_message(
            chat_id=telegram_id,
            text=text,
            reply_markup=builder.as_markup(),
            parse_mode="Markdown",
        )
    except Exception as e:
        logger.error("Failed to send survey to telegram_id=%s: %s", telegram_id, e)


# ---- Result callbacks — send AI results back to Telegram ----

async def send_meal_result(telegram_id: int, meal):
    """Send meal recognition result back to user via Telegram"""
    from app.telegram.bot import get_bot

    bot = get_bot()

    if meal.recognition_status == "done":
        lines = ["🍽 *Їжа розпізнана!*\n"]

        if meal.ai_comment:
            lines.append(f"_{meal.ai_comment}_\n")

        if meal.calories:
            lines.append(f"🔥 Калорії: {int(meal.calories)} ккал")
        if meal.proteins_g:
            lines.append(f"🥩 Білки: {meal.proteins_g:.0f}г")
        if meal.fats_g:
            lines.append(f"🧈 Жири: {meal.fats_g:.0f}г")
        if meal.carbs_g:
            lines.append(f"🍞 Вуглеводи: {meal.carbs_g:.0f}г")
        if meal.health_score is not None:
            score_emoji = "🟢" if meal.health_score >= 7 else "🟡" if meal.health_score >= 4 else "🔴"
            lines.append(f"\n{score_emoji} Оцінка здоров'я: {meal.health_score}/10")

        text = "\n".join(lines)
    else:
        text = "❌ Не вдалось розпізнати їжу на фото. Спробуй ще раз з кращим освітленням."

    try:
        await bot.send_message(chat_id=telegram_id, text=text, parse_mode="Markdown")
    except Exception as e:
        logger.error("Failed to send meal result to telegram_id=%s: %s", telegram_id, e)


async def send_document_result(telegram_id: int, doc):
    """Send document analysis result back to user via Telegram"""
    from app.telegram.bot import get_bot

    bot = get_bot()

    if doc.ocr_status == "done":
        lines = [f"📄 *Документ проаналізовано!*\n"]

        if doc.title:
            lines.append(f"📋 {doc.title}\n")

        # Show critical flags
        if doc.ai_flags:
            lines.append("⚠️ *Відхилення:*")
            for flag in doc.ai_flags[:5]:  # Max 5 flags
                indicator = flag.get("indicator", "")
                value = flag.get("value", "")
                concern = flag.get("concern", "")
                lines.append(f"  🔴 {indicator}: {value}")
                if concern:
                    lines.append(f"    _{concern}_")

        # Show AI summary if available
        if doc.ai_analysis:
            summary = doc.ai_analysis.get("summary", "")
            if summary:
                lines.append(f"\n💡 *Висновок:*\n{summary[:500]}")

        if not doc.ai_flags and not doc.ai_analysis:
            lines.append("✅ Все в нормі!")

        lines.append("\n📱 Детальніше — в додатку.")
        text = "\n".join(lines)
    else:
        text = "❌ Не вдалось проаналізувати документ. Перевір якість фото/PDF та спробуй ще раз."

    try:
        await bot.send_message(chat_id=telegram_id, text=text, parse_mode="Markdown")
    except Exception as e:
        logger.error("Failed to send document result to telegram_id=%s: %s", telegram_id, e)


async def send_advice_result(telegram_id: int, recommendation):
    """Send AI health recommendation to user via Telegram"""
    from app.telegram.bot import get_bot

    bot = get_bot()

    content = recommendation.content or {}
    summary = content.get("summary", "")
    recommendations_list = content.get("recommendations", [])

    lines = ["💡 *AI-аналіз здоров'я*\n"]

    if summary:
        lines.append(f"{summary}\n")

    if recommendations_list:
        lines.append("*Рекомендації:*")
        for i, rec in enumerate(recommendations_list[:5], 1):
            if isinstance(rec, dict):
                lines.append(f"{i}. {rec.get('text', rec.get('title', ''))}")
            else:
                lines.append(f"{i}. {rec}")

    if not summary and not recommendations_list:
        lines.append("Аналіз завершено. Дивись деталі в додатку.")

    text = "\n".join(lines)

    try:
        await bot.send_message(chat_id=telegram_id, text=text, parse_mode="Markdown")
    except Exception as e:
        logger.error("Failed to send advice to telegram_id=%s: %s", telegram_id, e)
