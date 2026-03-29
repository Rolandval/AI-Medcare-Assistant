"""Celery tasks for medication reminder push notifications"""

from app.celery_app import celery_app


@celery_app.task(name="app.tasks.reminder_tasks.check_medication_reminders")
def check_medication_reminders():
    """Check and send medication reminders for current time window"""
    import asyncio
    from datetime import datetime
    from sqlalchemy import create_engine as sync_create, select
    from sqlalchemy.orm import Session
    from app.core.config import settings
    from app.models.user import User
    from app.models.medication_reminder import MedicationReminder

    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = sync_create(sync_url)

    # Current time in Kyiv (UTC+2/+3)
    from zoneinfo import ZoneInfo
    now = datetime.now(ZoneInfo("Europe/Kyiv"))
    current_time = now.strftime("%H:%M")
    current_day = now.weekday()  # 0=Monday

    with Session(engine) as db:
        reminders = db.execute(
            select(MedicationReminder, User).join(User).where(
                MedicationReminder.is_active == True,
                User.is_active == True,
                User.notifications_enabled == True,
                User.expo_push_token.is_not(None),
            )
        ).all()

        messages = []
        for reminder, user in reminders:
            # Check if current day matches
            if reminder.days_of_week and current_day not in reminder.days_of_week:
                continue

            # Check if current time matches any scheduled time
            if current_time not in (reminder.times or []):
                continue

            emoji = reminder.emoji or "💊"
            title = f"{emoji} Час прийняти {reminder.name}"
            body = reminder.dosage or "Не забудь прийняти ліки"
            if reminder.instructions:
                body += f"\n{reminder.instructions}"

            messages.append({
                "to": user.expo_push_token,
                "title": title,
                "body": body,
                "data": {
                    "type": "medication_reminder",
                    "reminder_id": str(reminder.id),
                },
            })

    if messages:
        asyncio.run(_send_batch(messages))


async def _send_batch(messages):
    from app.services.push_notifications import send_push_notifications_batch
    await send_push_notifications_batch(messages)


@celery_app.task(name="app.tasks.reminder_tasks.check_survey_pushes")
def check_survey_pushes():
    """Check all users and send survey push if current hour matches their configured time"""
    import asyncio
    from datetime import datetime
    from zoneinfo import ZoneInfo
    from sqlalchemy import create_engine as sync_create, select
    from sqlalchemy.orm import Session
    from app.core.config import settings
    from app.models.user import User

    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = sync_create(sync_url)

    now = datetime.now(ZoneInfo("Europe/Kyiv"))
    current_hour = now.hour

    with Session(engine) as db:
        users = db.execute(
            select(User).where(
                User.is_active == True,
                User.notifications_enabled == True,
                User.expo_push_token.is_not(None),
            )
        ).scalars().all()

        messages = []
        for user in users:
            morning_h = getattr(user, "morning_survey_hour", None) or 8
            evening_h = getattr(user, "evening_survey_hour", None) or 21

            if current_hour == morning_h:
                messages.append({
                    "to": user.expo_push_token,
                    "title": "🌅 Доброго ранку!",
                    "body": f"{user.name}, як ти себе почуваєш? Заповни ранкове опитування",
                    "data": {"type": "survey", "survey_type": "morning"},
                })
            elif current_hour == evening_h:
                messages.append({
                    "to": user.expo_push_token,
                    "title": "🌙 Добрий вечір!",
                    "body": f"{user.name}, як пройшов день? Заповни вечірнє опитування",
                    "data": {"type": "survey", "survey_type": "evening"},
                })

    if messages:
        asyncio.run(_send_batch(messages))


@celery_app.task(name="app.tasks.reminder_tasks.send_survey_push")
def send_survey_push(survey_type: str):
    """Legacy: Send survey push to all users (kept for backwards compat)"""
    check_survey_pushes.delay()
