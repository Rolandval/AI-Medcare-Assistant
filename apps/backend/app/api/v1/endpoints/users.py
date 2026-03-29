"""User profile endpoints"""

import logging
from fastapi import APIRouter, HTTPException, UploadFile, File
from sqlalchemy import select

from app.api.deps import DB, CurrentUser
from app.models.user import User
from app.models.health_profile import HealthProfile
from app.schemas.user import UserProfileUpdate, HealthProfileUpdate, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: CurrentUser):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_profile(body: UserProfileUpdate, current_user: CurrentUser, db: DB):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/me/health-profile")
async def get_health_profile(current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(HealthProfile).where(HealthProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        # Auto-create empty health profile for new users
        profile = HealthProfile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


@router.patch("/me/health-profile")
async def update_health_profile(body: HealthProfileUpdate, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(HealthProfile).where(HealthProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = HealthProfile(user_id=current_user.id)
        db.add(profile)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: CurrentUser = None,
    db: DB = None,
):
    from app.services.storage import StorageService
    storage = StorageService()
    url = await storage.upload_file(
        file=file,
        folder=f"avatars/{current_user.id}",
        allowed_types=["image/jpeg", "image/png", "image/webp"],
    )
    current_user.avatar_url = url
    await db.commit()
    return {"avatar_url": url}


@router.post("/me/export-data")
async def export_user_data(current_user: CurrentUser, db: DB):
    """Export all user data as JSON. Sends async email in production."""
    from app.models.health_metric import HealthMetric
    from app.models.daily_survey import DailySurvey
    from app.models.meal import Meal
    from app.models.medical_document import MedicalDocument
    from app.models.ai_card import AICard
    from app.models.ai_chat_message import AIChatMessage

    # Health metrics
    metrics = (await db.execute(
        select(HealthMetric).where(HealthMetric.user_id == current_user.id)
        .order_by(HealthMetric.recorded_at.desc())
    )).scalars().all()

    # Surveys
    surveys = (await db.execute(
        select(DailySurvey).where(DailySurvey.user_id == current_user.id)
        .order_by(DailySurvey.survey_date.desc())
    )).scalars().all()

    # Meals
    meals = (await db.execute(
        select(Meal).where(Meal.user_id == current_user.id)
        .order_by(Meal.eaten_at.desc())
    )).scalars().all()

    # Documents
    documents = (await db.execute(
        select(MedicalDocument).where(MedicalDocument.user_id == current_user.id)
        .order_by(MedicalDocument.created_at.desc())
    )).scalars().all()

    # Health profile
    profile_result = await db.execute(
        select(HealthProfile).where(HealthProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()

    export = {
        "user": {
            "name": current_user.name,
            "email": current_user.email,
            "gender": current_user.gender,
            "birth_date": str(current_user.birth_date) if current_user.birth_date else None,
        },
        "health_profile": {
            "height_cm": profile.height_cm if profile else None,
            "weight_kg": profile.weight_kg if profile else None,
            "blood_type": profile.blood_type if profile else None,
            "chronic_conditions": profile.chronic_conditions if profile else [],
            "allergies": profile.allergies if profile else [],
            "health_goals": profile.health_goals if profile else [],
        },
        "metrics": [
            {
                "type": m.metric_type,
                "value": m.value,
                "unit": m.unit,
                "recorded_at": m.recorded_at.isoformat(),
            }
            for m in metrics
        ],
        "surveys": [
            {
                "date": str(s.survey_date),
                "type": s.survey_type,
                "mood": s.mood,
                "wellbeing": s.wellbeing_score,
                "energy": s.energy_level,
                "sleep_hours": s.sleep_hours,
            }
            for s in surveys
        ],
        "meals": [
            {
                "type": m.meal_type,
                "calories": m.calories,
                "proteins_g": m.proteins_g,
                "fats_g": m.fats_g,
                "carbs_g": m.carbs_g,
                "health_score": m.health_score,
                "eaten_at": m.eaten_at.isoformat() if m.eaten_at else None,
            }
            for m in meals
        ],
        "documents": [
            {
                "type": d.doc_type,
                "title": d.title,
                "ocr_status": d.ocr_status,
                "ai_flags": d.ai_flags,
                "created_at": d.created_at.isoformat(),
            }
            for d in documents
        ],
        "exported_at": __import__("datetime").datetime.now().isoformat(),
    }

    logger.info("Data export completed for user %s", current_user.id)
    return export


@router.delete("/me")
async def delete_account(current_user: CurrentUser, db: DB):
    """Permanently delete user account and all associated data"""
    logger.warning("Account deletion requested by user %s (%s)", current_user.id, current_user.email)
    await db.delete(current_user)
    await db.commit()
    return {"message": "Account deleted"}
