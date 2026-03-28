"""Gamification service — Health Score, Streaks, Achievements"""

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_card import AICard
from app.models.daily_survey import DailySurvey
from app.models.health_metric import HealthMetric
from app.models.meal import Meal
from app.models.medication_reminder import MedicationReminder
from app.models.user_streak import UserStreak
from app.models.user_achievement import UserAchievement
from app.models.ai_chat_message import AIChatMessage


# ---- Achievement Definitions ----

ACHIEVEMENTS = {
    "first_step": {
        "name": "Перший крок",
        "description": "Заповни перше опитування",
        "emoji": "👣",
        "points": 10,
    },
    "week_streak": {
        "name": "Тижневик",
        "description": "7 днів підряд відкривай додаток",
        "emoji": "🔥",
        "points": 50,
    },
    "marathon": {
        "name": "Марафонець",
        "description": "30 днів підряд без пропусків",
        "emoji": "🏅",
        "points": 200,
    },
    "photographer": {
        "name": "Фотограф",
        "description": "Залогуй 50 прийомів їжі",
        "emoji": "📸",
        "points": 100,
    },
    "control": {
        "name": "Контроль",
        "description": "Вимірюй тиск 14 днів підряд",
        "emoji": "📏",
        "points": 100,
    },
    "dream_team": {
        "name": "Команда мрії",
        "description": "Поговори з 5 різними лікарями",
        "emoji": "🩺",
        "points": 75,
    },
    "healthy_choice": {
        "name": "Здоровий вибір",
        "description": "5 прийомів їжі з оцінкою 8+ підряд",
        "emoji": "🥗",
        "points": 60,
    },
    "challenger": {
        "name": "Челенджер",
        "description": "Виконай 10 щоденних викликів",
        "emoji": "🎯",
        "points": 80,
    },
    "night_owl": {
        "name": "Здоровий сон",
        "description": "7 днів по 7+ годин сну",
        "emoji": "😴",
        "points": 50,
    },
    "social": {
        "name": "Соціальна тварина",
        "description": "Надішли 20 повідомлень лікарям",
        "emoji": "💬",
        "points": 40,
    },
}


# ---- Health Score Calculation ----

async def calculate_health_score(db: AsyncSession, user_id: uuid.UUID) -> dict:
    """Calculate health score 0-100 from multiple factors.

    Returns: {
        "total": 74,
        "breakdown": {
            "surveys": {"score": 12, "max": 15, "label": "Опитування"},
            "metrics": {"score": 10, "max": 15, "label": "Вимірювання"},
            "challenges": {"score": 16, "max": 20, "label": "Виклики"},
            "meals": {"score": 12, "max": 15, "label": "Харчування"},
            "medication": {"score": 14, "max": 15, "label": "Ліки"},
            "recommendations": {"score": 10, "max": 20, "label": "Поради"},
        }
    }
    """
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    # 1. Survey consistency (15%) — surveys filled in last 7 days / 14 possible
    survey_count = (await db.execute(
        select(func.count(DailySurvey.id))
        .where(DailySurvey.user_id == user_id, DailySurvey.survey_date >= week_ago)
    )).scalar() or 0
    survey_score = min(15, round(survey_count / 14 * 15))

    # 2. Metric tracking (15%) — measurements in last 7 days
    metric_count = (await db.execute(
        select(func.count(HealthMetric.id))
        .where(HealthMetric.user_id == user_id, HealthMetric.recorded_at >= week_ago)
    )).scalar() or 0
    metric_score = min(15, round(min(metric_count, 14) / 14 * 15))

    # 3. Challenge completion (20%) — acted challenges / total challenges last 7 days
    challenge_total = (await db.execute(
        select(func.count(AICard.id))
        .where(
            AICard.user_id == user_id,
            AICard.card_type == "challenge",
            AICard.created_at >= week_ago,
        )
    )).scalar() or 0
    challenge_done = (await db.execute(
        select(func.count(AICard.id))
        .where(
            AICard.user_id == user_id,
            AICard.card_type == "challenge",
            AICard.status == "acted",
            AICard.created_at >= week_ago,
        )
    )).scalar() or 0
    challenge_score = round(challenge_done / max(challenge_total, 1) * 20)

    # 4. Meal logging (15%) — meals logged in last 7 days / 21 target
    meal_count = (await db.execute(
        select(func.count(Meal.id))
        .where(Meal.user_id == user_id, Meal.created_at >= week_ago)
    )).scalar() or 0
    meal_score = min(15, round(meal_count / 21 * 15))

    # 5. Medication adherence (15%) — reminders completed / total
    med_total = (await db.execute(
        select(func.count(MedicationReminder.id))
        .where(MedicationReminder.user_id == user_id, MedicationReminder.is_active == True)
    )).scalar() or 0
    if med_total > 0:
        # Simplified: check if reminders exist. Full adherence tracking would need a separate table.
        med_score = 12  # Default decent score if they have reminders set up
    else:
        med_score = 15  # No meds needed = full score

    # 6. AI recommendations followed (20%) — cards marked "acted" / total actionable
    rec_total = (await db.execute(
        select(func.count(AICard.id))
        .where(
            AICard.user_id == user_id,
            AICard.action_type.isnot(None),
            AICard.created_at >= week_ago,
        )
    )).scalar() or 0
    rec_done = (await db.execute(
        select(func.count(AICard.id))
        .where(
            AICard.user_id == user_id,
            AICard.status == "acted",
            AICard.created_at >= week_ago,
        )
    )).scalar() or 0
    rec_score = round(rec_done / max(rec_total, 1) * 20)

    # Endowed progress: start at 30, not 0
    raw_total = survey_score + metric_score + challenge_score + meal_score + med_score + rec_score
    total = max(30, min(100, raw_total))

    return {
        "total": total,
        "breakdown": {
            "surveys": {"score": survey_score, "max": 15, "label": "Опитування"},
            "metrics": {"score": metric_score, "max": 15, "label": "Вимірювання"},
            "challenges": {"score": challenge_score, "max": 20, "label": "Виклики"},
            "meals": {"score": meal_score, "max": 15, "label": "Харчування"},
            "medication": {"score": med_score, "max": 15, "label": "Ліки"},
            "recommendations": {"score": rec_score, "max": 20, "label": "Поради"},
        },
    }


# ---- Streak Management ----

async def update_streak(
    db: AsyncSession, user_id: uuid.UUID, streak_type: str
) -> UserStreak:
    """Extend or reset a streak. Call when user performs the relevant daily action."""
    today = date.today()

    result = await db.execute(
        select(UserStreak).where(
            UserStreak.user_id == user_id,
            UserStreak.streak_type == streak_type,
        )
    )
    streak = result.scalar_one_or_none()

    if not streak:
        streak = UserStreak(
            user_id=user_id,
            streak_type=streak_type,
            current_count=1,
            best_count=1,
            last_date=today,
        )
        db.add(streak)
    elif streak.last_date == today:
        # Already counted today
        pass
    elif streak.last_date == today - timedelta(days=1):
        # Consecutive day — extend streak
        streak.current_count += 1
        streak.best_count = max(streak.best_count, streak.current_count)
        streak.last_date = today
    else:
        # Streak broken — reset
        streak.current_count = 1
        streak.last_date = today

    await db.commit()
    return streak


async def get_user_streaks(db: AsyncSession, user_id: uuid.UUID) -> list[dict]:
    """Get all streaks for a user."""
    result = await db.execute(
        select(UserStreak).where(UserStreak.user_id == user_id)
    )
    streaks = result.scalars().all()

    STREAK_META = {
        "checkin": {"label": "Щоденний чек-ін", "emoji": "🔥"},
        "medication": {"label": "Прийом ліків", "emoji": "💊"},
        "meals": {"label": "Логування їжі", "emoji": "📸"},
        "challenge": {"label": "Виконання викликів", "emoji": "🎯"},
    }

    return [
        {
            "type": s.streak_type,
            "label": STREAK_META.get(s.streak_type, {}).get("label", s.streak_type),
            "emoji": STREAK_META.get(s.streak_type, {}).get("emoji", "🔥"),
            "current": s.current_count,
            "best": s.best_count,
            "last_date": s.last_date.isoformat() if s.last_date else None,
            "active": s.last_date == date.today() or s.last_date == date.today() - timedelta(days=1),
        }
        for s in streaks
    ]


# ---- Achievement Checking ----

async def check_and_unlock_achievements(
    db: AsyncSession, user_id: uuid.UUID
) -> list[dict]:
    """Check all achievement conditions and unlock any new ones.
    Returns list of newly unlocked achievements."""
    now = datetime.now(timezone.utc)

    # Get already unlocked
    result = await db.execute(
        select(UserAchievement.achievement_key)
        .where(UserAchievement.user_id == user_id)
    )
    unlocked = set(result.scalars().all())

    newly_unlocked = []

    # first_step — first survey completed
    if "first_step" not in unlocked:
        count = (await db.execute(
            select(func.count(DailySurvey.id))
            .where(DailySurvey.user_id == user_id)
        )).scalar() or 0
        # Also check survey cards acted
        card_surveys = (await db.execute(
            select(func.count(AICard.id))
            .where(AICard.user_id == user_id, AICard.card_type == "survey", AICard.status == "acted")
        )).scalar() or 0
        if count > 0 or card_surveys > 0:
            newly_unlocked.append("first_step")

    # week_streak — 7-day check-in streak
    if "week_streak" not in unlocked:
        streak = (await db.execute(
            select(UserStreak)
            .where(UserStreak.user_id == user_id, UserStreak.streak_type == "checkin")
        )).scalar_one_or_none()
        if streak and streak.best_count >= 7:
            newly_unlocked.append("week_streak")

    # marathon — 30-day streak
    if "marathon" not in unlocked:
        streak = (await db.execute(
            select(UserStreak)
            .where(UserStreak.user_id == user_id, UserStreak.streak_type == "checkin")
        )).scalar_one_or_none()
        if streak and streak.best_count >= 30:
            newly_unlocked.append("marathon")

    # photographer — 50 meals logged
    if "photographer" not in unlocked:
        count = (await db.execute(
            select(func.count(Meal.id)).where(Meal.user_id == user_id)
        )).scalar() or 0
        if count >= 50:
            newly_unlocked.append("photographer")

    # challenger — 10 challenges completed
    if "challenger" not in unlocked:
        count = (await db.execute(
            select(func.count(AICard.id))
            .where(AICard.user_id == user_id, AICard.card_type == "challenge", AICard.status == "acted")
        )).scalar() or 0
        if count >= 10:
            newly_unlocked.append("challenger")

    # dream_team — chat with 5 different doctors
    if "dream_team" not in unlocked:
        doctors_chatted = (await db.execute(
            select(func.count(func.distinct(AIChatMessage.doctor_id)))
            .where(AIChatMessage.user_id == user_id, AIChatMessage.role == "user")
        )).scalar() or 0
        if doctors_chatted >= 5:
            newly_unlocked.append("dream_team")

    # social — 20 messages sent
    if "social" not in unlocked:
        msg_count = (await db.execute(
            select(func.count(AIChatMessage.id))
            .where(AIChatMessage.user_id == user_id, AIChatMessage.role == "user")
        )).scalar() or 0
        if msg_count >= 20:
            newly_unlocked.append("social")

    # Save newly unlocked
    for key in newly_unlocked:
        achievement = UserAchievement(
            user_id=user_id,
            achievement_key=key,
            unlocked_at=now,
        )
        db.add(achievement)

    if newly_unlocked:
        await db.commit()

    return [
        {**ACHIEVEMENTS[key], "key": key, "unlocked_at": now.isoformat()}
        for key in newly_unlocked
    ]


async def get_user_achievements(db: AsyncSession, user_id: uuid.UUID) -> list[dict]:
    """Get all achievements — both unlocked and locked."""
    result = await db.execute(
        select(UserAchievement)
        .where(UserAchievement.user_id == user_id)
    )
    unlocked_rows = result.scalars().all()
    unlocked_map = {a.achievement_key: a.unlocked_at for a in unlocked_rows}

    return [
        {
            "key": key,
            **info,
            "unlocked": key in unlocked_map,
            "unlocked_at": unlocked_map[key].isoformat() if key in unlocked_map else None,
        }
        for key, info in ACHIEVEMENTS.items()
    ]
