"""Celery AI background tasks"""

import asyncio
from datetime import date, timedelta, datetime, timezone

from app.celery_app import celery_app


def run_async(coro):
    """Helper to run async code in Celery tasks"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.tasks.ai_tasks.analyze_health_task", queue="ai_tasks")
def analyze_health_task(user_id: str):
    """Analyze user health and save AI recommendation"""
    from sqlalchemy import select, create_engine
    from sqlalchemy.orm import Session
    from app.core.config import settings
    from app.models.user import User
    from app.models.health_metric import HealthMetric
    from app.models.daily_survey import DailySurvey
    from app.models.ai_recommendation import AIRecommendation
    from app.services.ai_engine import AIEngine
    from datetime import date

    # Use sync engine for Celery
    from sqlalchemy import create_engine as sync_create
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")

    engine = sync_create(sync_url)
    with Session(engine) as db:
        # Fetch user
        user = db.get(User, user_id)
        if not user:
            return

        # Get age
        age = None
        if user.birth_date:
            today = date.today()
            age = today.year - user.birth_date.year

        # Get latest metrics
        metrics_rows = db.execute(
            select(HealthMetric)
            .where(HealthMetric.user_id == user_id)
            .order_by(HealthMetric.recorded_at.desc())
            .limit(50)
        ).scalars().all()

        latest_metrics = {}
        for m in metrics_rows:
            if m.metric_type not in latest_metrics:
                latest_metrics[m.metric_type] = {"value": m.value, "unit": m.unit}

        # Get recent surveys
        surveys = db.execute(
            select(DailySurvey)
            .where(DailySurvey.user_id == user_id)
            .order_by(DailySurvey.survey_date.desc())
            .limit(6)
        ).scalars().all()

        surveys_data = [
            {
                "survey_type": s.survey_type,
                "survey_date": str(s.survey_date.date()),
                "wellbeing_score": s.wellbeing_score,
                "mood": s.mood,
                "sleep_hours": s.sleep_hours,
                "stress_level": s.stress_level,
                "energy_level": s.energy_level,
                "pain_locations": s.pain_locations,
            }
            for s in surveys
        ]

        # Build user data dict
        hp = user.health_profile
        user_data = {
            "name": user.name,
            "age": age,
            "gender": user.gender,
            "occupation": user.occupation,
            "lifestyle": user.lifestyle,
            "location_city": user.location_city,
            "health_profile": {
                "height_cm": hp.height_cm if hp else None,
                "weight_kg": hp.weight_kg if hp else None,
                "blood_type": hp.blood_type if hp else None,
                "chronic_conditions": hp.chronic_conditions if hp else [],
                "allergies": hp.allergies if hp else [],
                "current_medications": hp.current_medications if hp else [],
                "physical_features": hp.physical_features if hp else [],
                "professional_risks": hp.professional_risks if hp else [],
            } if hp else {},
            "latest_metrics": latest_metrics,
            "recent_surveys": surveys_data,
        }

        # Run AI analysis
        engine_ai = AIEngine()
        result = asyncio.run(engine_ai.analyze_health(user_data))

        # Save recommendation
        rec = AIRecommendation(
            user_id=user_id,
            rec_type="daily_brief",
            agents_used=result.get("agents_used", []),
            content=result,
            valid_until=datetime.now(timezone.utc) + timedelta(hours=12),
        )
        db.add(rec)
        db.commit()


@celery_app.task(name="app.tasks.ai_tasks.recognize_meal_task", queue="ai_tasks")
def recognize_meal_task(meal_id: str):
    """Recognize food from meal photo"""
    from sqlalchemy import create_engine as sync_create
    from sqlalchemy.orm import Session
    from app.core.config import settings
    from app.models.meal import Meal
    from app.services.ai_engine import AIEngine

    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = sync_create(sync_url)

    with Session(engine) as db:
        meal = db.get(Meal, meal_id)
        if not meal or not meal.photo_url:
            return

        meal.recognition_status = "processing"
        db.commit()

        try:
            engine_ai = AIEngine()
            result = asyncio.run(engine_ai.recognize_food(meal.photo_url))

            if result:
                meal.ai_recognition = result
                meal.calories = result.get("total_calories")
                meal.proteins_g = result.get("proteins_g")
                meal.fats_g = result.get("fats_g")
                meal.carbs_g = result.get("carbs_g")
                meal.fiber_g = result.get("fiber_g")
                meal.health_score = result.get("health_score")
                meal.ai_comment = result.get("comment")
                meal.recognition_status = "done"
            else:
                meal.recognition_status = "failed"

            db.commit()
        except Exception:
            meal.recognition_status = "failed"
            db.commit()


@celery_app.task(name="app.tasks.ai_tasks.process_document_task", queue="ai_tasks")
def process_document_task(doc_id: str):
    """OCR + analyze medical document"""
    from sqlalchemy import create_engine as sync_create
    from sqlalchemy.orm import Session
    from app.core.config import settings
    from app.models.medical_document import MedicalDocument
    from app.services.ai_engine import AIEngine

    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = sync_create(sync_url)

    with Session(engine) as db:
        doc = db.get(MedicalDocument, doc_id)
        if not doc:
            return

        doc.ocr_status = "processing"
        db.commit()

        try:
            engine_ai = AIEngine()
            result = asyncio.run(engine_ai.process_medical_document(doc.file_url, doc.doc_type))

            if result:
                doc.parsed_data = result.get("indicators")
                doc.ai_analysis = result
                doc.ai_flags = result.get("critical_flags", [])
                doc.ocr_status = "done"
            else:
                doc.ocr_status = "failed"

            db.commit()
        except Exception:
            doc.ocr_status = "failed"
            db.commit()


@celery_app.task(name="app.tasks.ai_tasks.generate_family_menu_task", queue="ai_tasks")
def generate_family_menu_task(family_id: str):
    """Generate weekly menu for family"""
    from sqlalchemy import create_engine as sync_create, select
    from sqlalchemy.orm import Session
    from app.core.config import settings
    from app.models.family import Family
    from app.models.family_menu import FamilyMenu
    from app.services.ai_engine import AIEngine
    from datetime import date

    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = sync_create(sync_url)

    with Session(engine) as db:
        family = db.get(Family, family_id)
        if not family:
            return

        today = date.today()
        week_start = today - timedelta(days=today.weekday())

        members_data = []
        for member in family.members:
            age = None
            if member.birth_date:
                age = today.year - member.birth_date.year

            hp = member.health_profile
            restrictions = []
            if hp and hp.allergies:
                restrictions.extend(hp.allergies)
            if hp and hp.chronic_conditions:
                restrictions.extend(hp.chronic_conditions)

            members_data.append({
                "name": member.name,
                "age": age,
                "gender": member.gender,
                "dietary_restrictions": restrictions,
                "health_summary": "нормальний",
            })

        engine_ai = AIEngine()
        result = asyncio.run(engine_ai.generate_family_menu(members_data))

        if result:
            # Remove existing menu for this week
            existing = db.execute(
                select(FamilyMenu).where(
                    FamilyMenu.family_id == family_id,
                    FamilyMenu.week_start == week_start,
                )
            ).scalar_one_or_none()

            if existing:
                db.delete(existing)

            menu = FamilyMenu(
                family_id=family_id,
                week_start=week_start,
                menu_data=result.get("week_menu", {}),
                shopping_list=result.get("shopping_list", {}),
                optimization_notes={"cooking_tips": result.get("cooking_tips", "")},
            )
            db.add(menu)
            db.commit()


@celery_app.task(name="app.tasks.ai_tasks.generate_all_family_menus")
def generate_all_family_menus():
    """Weekly: generate menus for all families"""
    from sqlalchemy import create_engine as sync_create, select
    from sqlalchemy.orm import Session
    from app.core.config import settings
    from app.models.family import Family

    sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    engine = sync_create(sync_url)

    with Session(engine) as db:
        families = db.execute(select(Family)).scalars().all()
        for family in families:
            generate_family_menu_task.delay(str(family.id))
