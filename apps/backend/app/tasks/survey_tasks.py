"""Celery tasks for Telegram survey scheduling"""

from app.celery_app import celery_app


@celery_app.task(name="app.tasks.survey_tasks.send_morning_surveys")
def send_morning_surveys():
    """Send morning survey to all Telegram users"""
    import asyncio
    from sqlalchemy import create_engine as sync_create, select
    from sqlalchemy.orm import Session
    from app.core.config import settings
    from app.models.user import User

    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = sync_create(sync_url)

    with Session(engine) as db:
        users = db.execute(
            select(User).where(
                User.telegram_id.is_not(None),
                User.is_active == True,
                User.notifications_enabled == True,
            )
        ).scalars().all()

        for user in users:
            send_survey_to_user.delay(str(user.id), "morning")


@celery_app.task(name="app.tasks.survey_tasks.send_evening_surveys")
def send_evening_surveys():
    """Send evening survey to all Telegram users"""
    import asyncio
    from sqlalchemy import create_engine as sync_create, select
    from sqlalchemy.orm import Session
    from app.core.config import settings
    from app.models.user import User

    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = sync_create(sync_url)

    with Session(engine) as db:
        users = db.execute(
            select(User).where(
                User.telegram_id.is_not(None),
                User.is_active == True,
                User.notifications_enabled == True,
            )
        ).scalars().all()

        for user in users:
            send_survey_to_user.delay(str(user.id), "evening")


@celery_app.task(name="app.tasks.survey_tasks.send_survey_to_user")
def send_survey_to_user(user_id: str, survey_type: str):
    """Send survey message to specific user via Telegram"""
    import asyncio
    from sqlalchemy import create_engine as sync_create
    from sqlalchemy.orm import Session
    from app.core.config import settings
    from app.models.user import User

    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = sync_create(sync_url)

    with Session(engine) as db:
        user = db.get(User, user_id)
        if not user or not user.telegram_id:
            return

    # Import and run bot
    from app.telegram.surveys import send_survey
    asyncio.run(send_survey(user.telegram_id, user.name, survey_type))
