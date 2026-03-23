"""Celery application setup"""

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "medcare",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.ai_tasks", "app.tasks.survey_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Kiev",
    enable_utc=True,
    task_routes={
        "app.tasks.ai_tasks.*": {"queue": "ai_tasks"},
        "app.tasks.survey_tasks.*": {"queue": "default"},
    },
    beat_schedule={
        # Morning surveys
        "send-morning-surveys": {
            "task": "app.tasks.survey_tasks.send_morning_surveys",
            "schedule": crontab(
                hour=settings.MORNING_SURVEY_HOUR,
                minute=settings.MORNING_SURVEY_MINUTE,
            ),
        },
        # Evening surveys
        "send-evening-surveys": {
            "task": "app.tasks.survey_tasks.send_evening_surveys",
            "schedule": crontab(
                hour=settings.EVENING_SURVEY_HOUR,
                minute=settings.EVENING_SURVEY_MINUTE,
            ),
        },
        # Weekly family menu generation (Sunday 18:00)
        "generate-weekly-menus": {
            "task": "app.tasks.ai_tasks.generate_all_family_menus",
            "schedule": crontab(hour=15, minute=0, day_of_week=0),
        },
    },
)
