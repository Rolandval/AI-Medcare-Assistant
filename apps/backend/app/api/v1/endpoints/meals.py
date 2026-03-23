"""Meals / nutrition endpoints"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, Query
from sqlalchemy import select, func

from app.api.deps import DB, CurrentUser
from app.models.meal import Meal

router = APIRouter(prefix="/meals", tags=["meals"])


@router.post("/", status_code=201)
async def log_meal(
    file: Optional[UploadFile] = File(None),
    meal_type: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: CurrentUser = None,
    db: DB = None,
):
    photo_url = None
    if file:
        from app.services.storage import StorageService
        storage = StorageService()
        photo_url = await storage.upload_file(
            file=file,
            folder=f"meals/{current_user.id}",
            allowed_types=["image/jpeg", "image/png", "image/webp", "image/heic"],
        )

    meal = Meal(
        user_id=current_user.id,
        meal_type=meal_type,
        description=description,
        photo_url=photo_url,
        eaten_at=datetime.now(timezone.utc),
        recognition_status="pending" if photo_url else "manual",
    )
    db.add(meal)
    await db.commit()
    await db.refresh(meal)

    # Trigger AI food recognition if photo provided
    if photo_url:
        from app.tasks.ai_tasks import recognize_meal_task
        recognize_meal_task.delay(str(meal.id))

    return {"id": str(meal.id), "status": "processing" if photo_url else "done"}


@router.get("/today")
async def get_today_meals(current_user: CurrentUser, db: DB):
    from datetime import date
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(Meal)
        .where(Meal.user_id == current_user.id, Meal.eaten_at >= today_start)
        .order_by(Meal.eaten_at)
    )
    meals = result.scalars().all()

    total_calories = sum(m.calories or 0 for m in meals)
    total_proteins = sum(m.proteins_g or 0 for m in meals)
    total_fats = sum(m.fats_g or 0 for m in meals)
    total_carbs = sum(m.carbs_g or 0 for m in meals)

    return {
        "meals": meals,
        "totals": {
            "calories": round(total_calories),
            "proteins_g": round(total_proteins, 1),
            "fats_g": round(total_fats, 1),
            "carbs_g": round(total_carbs, 1),
        }
    }


@router.get("/", response_model=List[dict])
async def list_meals(
    current_user: CurrentUser,
    db: DB,
    limit: int = Query(20, le=100),
):
    result = await db.execute(
        select(Meal)
        .where(Meal.user_id == current_user.id)
        .order_by(Meal.eaten_at.desc())
        .limit(limit)
    )
    meals = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "meal_type": m.meal_type,
            "photo_url": m.photo_url,
            "calories": m.calories,
            "health_score": m.health_score,
            "ai_comment": m.ai_comment,
            "eaten_at": m.eaten_at,
            "recognition_status": m.recognition_status,
        }
        for m in meals
    ]
