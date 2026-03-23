"""Health metrics + daily surveys endpoints"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Query
from sqlalchemy import select, and_

from app.api.deps import DB, CurrentUser
from app.models.health_metric import HealthMetric
from app.models.daily_survey import DailySurvey
from app.schemas.health import MetricCreate, MetricResponse, SurveyCreate, SurveyResponse

router = APIRouter(prefix="/health", tags=["health"])


# --- Metrics ---

@router.post("/metrics", response_model=MetricResponse, status_code=201)
async def add_metric(body: MetricCreate, current_user: CurrentUser, db: DB):
    metric = HealthMetric(
        user_id=current_user.id,
        metric_type=body.metric_type,
        value=body.value,
        unit=body.unit,
        source=body.source,
        recorded_at=body.recorded_at or datetime.now(timezone.utc),
    )
    db.add(metric)
    await db.commit()
    await db.refresh(metric)
    return metric


@router.get("/metrics", response_model=List[MetricResponse])
async def get_metrics(
    current_user: CurrentUser,
    db: DB,
    metric_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
):
    query = select(HealthMetric).where(HealthMetric.user_id == current_user.id)
    if metric_type:
        query = query.where(HealthMetric.metric_type == metric_type)
    query = query.order_by(HealthMetric.recorded_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/metrics/latest")
async def get_latest_metrics(current_user: CurrentUser, db: DB):
    """Get the latest value for each metric type"""
    from sqlalchemy import func
    subq = (
        select(HealthMetric.metric_type, func.max(HealthMetric.recorded_at).label("max_at"))
        .where(HealthMetric.user_id == current_user.id)
        .group_by(HealthMetric.metric_type)
        .subquery()
    )
    query = select(HealthMetric).join(
        subq,
        and_(
            HealthMetric.metric_type == subq.c.metric_type,
            HealthMetric.recorded_at == subq.c.max_at,
        ),
    ).where(HealthMetric.user_id == current_user.id)
    result = await db.execute(query)
    metrics = result.scalars().all()
    return {m.metric_type: {"value": m.value, "unit": m.unit, "recorded_at": m.recorded_at} for m in metrics}


# --- Daily Surveys ---

@router.post("/surveys", response_model=SurveyResponse, status_code=201)
async def submit_survey(body: SurveyCreate, current_user: CurrentUser, db: DB):
    survey = DailySurvey(
        user_id=current_user.id,
        survey_date=datetime.now(timezone.utc),
        **body.model_dump(),
    )
    db.add(survey)
    await db.commit()
    await db.refresh(survey)

    # Trigger AI analysis in background
    from app.tasks.ai_tasks import analyze_health_task
    analyze_health_task.delay(str(current_user.id))

    return survey


@router.get("/surveys", response_model=List[SurveyResponse])
async def get_surveys(
    current_user: CurrentUser,
    db: DB,
    survey_type: Optional[str] = Query(None),
    limit: int = Query(14, le=100),
):
    query = select(DailySurvey).where(DailySurvey.user_id == current_user.id)
    if survey_type:
        query = query.where(DailySurvey.survey_type == survey_type)
    query = query.order_by(DailySurvey.survey_date.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
