"""Celery tasks for AI Feed — generate cards for morning/afternoon/evening rounds"""

import asyncio
from datetime import date, datetime, timezone

from app.celery_app import celery_app


def _build_user_context_sync(db, user):
    """Build user context string for AI (sync version for Celery)"""
    from sqlalchemy import select
    from app.models.health_metric import HealthMetric
    from app.models.daily_survey import DailySurvey
    from app.models.meal import Meal

    ctx = []
    age = None
    if user.birth_date:
        age = date.today().year - user.birth_date.year

    ctx.append(f"Пацієнт: {user.name}")
    if age:
        ctx.append(f"Вік: {age} років")
    if user.gender:
        ctx.append(f"Стать: {user.gender}")
    if user.occupation:
        ctx.append(f"Професія: {user.occupation}")
    if user.lifestyle:
        ctx.append(f"Спосіб життя: {user.lifestyle}")

    hp = user.health_profile
    if hp:
        if hp.height_cm:
            ctx.append(f"Зріст: {hp.height_cm} см")
        if hp.weight_kg:
            ctx.append(f"Вага: {hp.weight_kg} кг")
        if hp.chronic_conditions:
            ctx.append(f"Хронічні хвороби: {', '.join(hp.chronic_conditions)}")
        if hp.allergies:
            ctx.append(f"Алергії: {', '.join(hp.allergies)}")
        if hp.current_medications:
            ctx.append(f"Ліки: {', '.join(hp.current_medications)}")
        if hp.health_goals:
            ctx.append(f"Цілі: {', '.join(hp.health_goals)}")

    # Latest metrics
    metrics_rows = db.execute(
        select(HealthMetric)
        .where(HealthMetric.user_id == user.id)
        .order_by(HealthMetric.recorded_at.desc())
        .limit(20)
    ).scalars().all()

    latest = {}
    for m in metrics_rows:
        if m.metric_type not in latest:
            latest[m.metric_type] = {"value": m.value, "unit": m.unit}

    if latest:
        ctx.append("\nПоказники:")
        for mt, d in latest.items():
            ctx.append(f"  {mt}: {d['value']} {d['unit']}")

    # Recent surveys
    surveys = db.execute(
        select(DailySurvey)
        .where(DailySurvey.user_id == user.id)
        .order_by(DailySurvey.survey_date.desc())
        .limit(4)
    ).scalars().all()

    if surveys:
        ctx.append("\nОстанні опитування:")
        for s in surveys:
            parts = [f"самопочуття {s.wellbeing_score}/10" if s.wellbeing_score else ""]
            if s.mood:
                parts.append(f"настрій {s.mood}")
            if s.sleep_hours:
                parts.append(f"сон {s.sleep_hours}г")
            if s.stress_level:
                parts.append(f"стрес {s.stress_level}")
            if s.energy_level:
                parts.append(f"енергія {s.energy_level}/10")
            ctx.append(f"  {s.survey_type} {s.survey_date.date()}: {', '.join(p for p in parts if p)}")

    # Recent meals (today)
    meals = db.execute(
        select(Meal)
        .where(Meal.user_id == user.id)
        .order_by(Meal.created_at.desc())
        .limit(6)
    ).scalars().all()

    if meals:
        ctx.append("\nОстанні прийоми їжі:")
        for m in meals:
            if m.calories:
                ctx.append(f"  {m.meal_type}: {m.calories} ккал, Б{m.proteins_g or 0}г Ж{m.fats_g or 0}г В{m.carbs_g or 0}г")

    user_data = {
        "latest_metrics": latest,
        "health_profile": {
            "current_medications": hp.current_medications if hp else [],
            "chronic_conditions": hp.chronic_conditions if hp else [],
        } if hp else {},
    }

    return "\n".join(ctx), user_data


@celery_app.task(name="app.tasks.feed_tasks.generate_round_for_user", queue="ai_tasks")
def generate_round_for_user(user_id: str, round_type: str):
    """Generate AI feed cards for a single user's round"""
    from sqlalchemy import create_engine as sync_create
    from sqlalchemy.orm import Session
    from app.core.config import settings
    from app.models.user import User
    from app.models.ai_card import AICard
    from app.services.ai_doctors import AICardGenerator
    from app.services.push_notifications import send_push_notification

    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = sync_create(sync_url)

    with Session(engine) as db:
        user = db.get(User, user_id)
        if not user or not user.is_active:
            return

        context_str, user_data = _build_user_context_sync(db, user)

        generator = AICardGenerator()
        cards = asyncio.run(generator.generate_round(round_type, context_str, user_data))

        for card_data in cards:
            card = AICard(
                user_id=user_id,
                doctor_id=card_data["doctor_id"],
                card_type=card_data["card_type"],
                round_type=round_type,
                title=card_data["title"],
                body=card_data["body"],
                metadata=card_data.get("metadata", {}),
                action_type=card_data.get("action_type"),
                expires_at=card_data.get("expires_at"),
            )
            db.add(card)

        db.commit()

        # Send push notification
        if user.expo_push_token and user.notifications_enabled:
            round_labels = {
                "morning": "Ранковий раунд",
                "afternoon": "Денний раунд",
                "evening": "Вечірній раунд",
            }
            label = round_labels.get(round_type, "Нові поради")
            doctor_names = list(set(c["doctor_id"] for c in cards))
            from app.services.ai_doctors import DOCTORS
            names = [DOCTORS.get(d, {}).get("name", "") for d in doctor_names[:3]]

            asyncio.run(send_push_notification(
                user.expo_push_token,
                title=f"🩺 {label}",
                body=f"{', '.join(names)} підготували для тебе поради",
                data={"type": "ai_feed", "round": round_type},
            ))


@celery_app.task(name="app.tasks.feed_tasks.generate_round_for_all")
def generate_round_for_all(round_type: str):
    """Generate AI feed cards for all active users"""
    from sqlalchemy import create_engine as sync_create, select
    from sqlalchemy.orm import Session
    from app.core.config import settings
    from app.models.user import User

    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = sync_create(sync_url)

    with Session(engine) as db:
        users = db.execute(
            select(User).where(User.is_active == True)
        ).scalars().all()

        for user in users:
            generate_round_for_user.delay(str(user.id), round_type)
