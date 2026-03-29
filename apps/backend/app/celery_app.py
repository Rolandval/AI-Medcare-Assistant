"""Celery application setup"""

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "medcare",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.ai_tasks",
        "app.tasks.survey_tasks",
        "app.tasks.reminder_tasks",
        "app.tasks.feed_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Kiev",
    enable_utc=True,
    task_routes={
        "app.tasks.ai_tasks.*": {"queue": "ai_tasks"},
        "app.tasks.feed_tasks.*": {"queue": "ai_tasks"},
        "app.tasks.survey_tasks.*": {"queue": "default"},
        "app.tasks.reminder_tasks.*": {"queue": "default"},
    },
    beat_schedule={
        # Morning surveys (Telegram)
        "send-morning-surveys": {
            "task": "app.tasks.survey_tasks.send_morning_surveys",
            "schedule": crontab(
                hour=settings.MORNING_SURVEY_HOUR,
                minute=settings.MORNING_SURVEY_MINUTE,
            ),
        },
        # Evening surveys (Telegram)
        "send-evening-surveys": {
            "task": "app.tasks.survey_tasks.send_evening_surveys",
            "schedule": crontab(
                hour=settings.EVENING_SURVEY_HOUR,
                minute=settings.EVENING_SURVEY_MINUTE,
            ),
        },
        # Survey push notifications — runs every 30 min, sends to users whose configured time matches
        "check-survey-pushes": {
            "task": "app.tasks.reminder_tasks.check_survey_pushes",
            "schedule": crontab(minute="0,30"),
        },
        # Medication reminders — check every minute
        "check-medication-reminders": {
            "task": "app.tasks.reminder_tasks.check_medication_reminders",
            "schedule": crontab(),  # every minute
        },
        # Weekly family menu generation (Sunday 18:00)
        "generate-weekly-menus": {
            "task": "app.tasks.ai_tasks.generate_all_family_menus",
            "schedule": crontab(hour=15, minute=0, day_of_week=0),
        },
        # AI Feed — Morning round (07:00 Kyiv = 05:00 UTC)
        "ai-feed-morning-round": {
            "task": "app.tasks.feed_tasks.generate_round_for_all",
            "schedule": crontab(hour=5, minute=0),
            "args": ["morning"],
        },
        # AI Feed — Afternoon round (13:00 Kyiv = 11:00 UTC)
        "ai-feed-afternoon-round": {
            "task": "app.tasks.feed_tasks.generate_round_for_all",
            "schedule": crontab(hour=11, minute=0),
            "args": ["afternoon"],
        },
        # AI Feed — Evening round (20:00 Kyiv = 18:00 UTC)
        "ai-feed-evening-round": {
            "task": "app.tasks.feed_tasks.generate_round_for_all",
            "schedule": crontab(hour=18, minute=0),
            "args": ["evening"],
        },
    },
)
