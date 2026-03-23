"""AI recommendations endpoints"""

from typing import List, Optional
from fastapi import APIRouter, Query
from sqlalchemy import select

from app.api.deps import DB, CurrentUser
from app.models.ai_recommendation import AIRecommendation

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/recommendations")
async def get_recommendations(
    current_user: CurrentUser,
    db: DB,
    rec_type: Optional[str] = Query(None),
    limit: int = Query(10, le=50),
):
    query = select(AIRecommendation).where(AIRecommendation.user_id == current_user.id)
    if rec_type:
        query = query.where(AIRecommendation.rec_type == rec_type)
    query = query.order_by(AIRecommendation.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/dashboard")
async def get_dashboard_summary(current_user: CurrentUser, db: DB):
    """Get latest AI summary for dashboard"""
    result = await db.execute(
        select(AIRecommendation)
        .where(
            AIRecommendation.user_id == current_user.id,
            AIRecommendation.rec_type == "daily_brief",
        )
        .order_by(AIRecommendation.created_at.desc())
        .limit(1)
    )
    latest = result.scalar_one_or_none()
    return latest


@router.post("/analyze-now")
async def trigger_analysis(current_user: CurrentUser):
    """Manually trigger AI health analysis"""
    from app.tasks.ai_tasks import analyze_health_task
    analyze_health_task.delay(str(current_user.id))
    return {"message": "Analysis started. Results will appear in 20-30 seconds."}


@router.patch("/recommendations/{rec_id}/read")
async def mark_as_read(rec_id: str, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(AIRecommendation).where(
            AIRecommendation.id == rec_id,
            AIRecommendation.user_id == current_user.id,
        )
    )
    rec = result.scalar_one_or_none()
    if rec:
        rec.is_read = True
        await db.commit()
    return {"ok": True}
