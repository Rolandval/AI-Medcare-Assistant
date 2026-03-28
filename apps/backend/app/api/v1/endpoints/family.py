"""Family endpoints"""

import uuid
import secrets
from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import DB, CurrentUser
from app.models.family import Family
from app.models.user import User
from app.models.family_menu import FamilyMenu

router = APIRouter(prefix="/family", tags=["family"])


class FamilyCreate(BaseModel):
    name: str


class FamilyJoin(BaseModel):
    invite_code: str


@router.post("/create", status_code=201)
async def create_family(body: FamilyCreate, current_user: CurrentUser, db: DB):
    if current_user.family_id:
        raise HTTPException(status_code=400, detail="Already in a family")

    family = Family(
        name=body.name,
        invite_code=secrets.token_urlsafe(8),
    )
    db.add(family)
    await db.flush()

    current_user.family_id = family.id
    current_user.is_family_admin = True
    await db.commit()
    await db.refresh(family)
    return family


@router.post("/join")
async def join_family(body: FamilyJoin, current_user: CurrentUser, db: DB):
    result = await db.execute(select(Family).where(Family.invite_code == body.invite_code))
    family = result.scalar_one_or_none()
    if not family:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    current_user.family_id = family.id
    await db.commit()
    return {"message": "Joined family", "family_name": family.name}


@router.get("/me")
async def get_my_family(current_user: CurrentUser, db: DB):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="Not in a family")

    result = await db.execute(select(Family).where(Family.id == current_user.family_id))
    family = result.scalar_one_or_none()

    members_data = []
    for member in family.members:
        members_data.append({
            "id": str(member.id),
            "name": member.name,
            "birth_date": member.birth_date,
            "gender": member.gender,
            "avatar_url": member.avatar_url,
            "is_admin": member.is_family_admin,
        })

    return {
        "id": str(family.id),
        "name": family.name,
        "invite_code": family.invite_code if current_user.is_family_admin else None,
        "members": members_data,
    }


@router.get("/menu/current")
async def get_current_menu(current_user: CurrentUser, db: DB):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="Not in a family")

    from datetime import date, timedelta
    today = date.today()
    week_start = today - timedelta(days=today.weekday())  # Monday

    result = await db.execute(
        select(FamilyMenu).where(
            FamilyMenu.family_id == current_user.family_id,
            FamilyMenu.week_start == week_start,
        )
    )
    menu = result.scalar_one_or_none()
    if not menu:
        raise HTTPException(status_code=404, detail="No menu for this week. Generate one first.")
    return menu


@router.get("/members/{member_id}/health")
async def get_member_health(member_id: str, current_user: CurrentUser, db: DB):
    """Get health summary for a family member (admin only or self)"""
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="Not in a family")

    member_uuid = uuid.UUID(member_id)

    # Verify member is in same family
    result = await db.execute(
        select(User).where(User.id == member_uuid, User.family_id == current_user.family_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your family")

    # Only admin or the member themselves can view
    if not current_user.is_family_admin and current_user.id != member_uuid:
        raise HTTPException(status_code=403, detail="Only admin can view other members")

    from app.models.health_metric import HealthMetric
    from app.models.medical_document import MedicalDocument

    # Latest metrics — key-value model (metric_type + value)
    metrics_result = await db.execute(
        select(HealthMetric)
        .where(HealthMetric.user_id == member_uuid)
        .order_by(HealthMetric.recorded_at.desc())
        .limit(20)
    )
    all_metrics = metrics_result.scalars().all()

    latest_metrics = {}
    seen_types: set[str] = set()
    for m in all_metrics:
        if m.metric_type in seen_types:
            continue
        seen_types.add(m.metric_type)
        if m.metric_type == "weight":
            latest_metrics["weight"] = round(m.value, 1)
        elif m.metric_type == "blood_pressure_systolic":
            latest_metrics["systolic"] = int(m.value)
        elif m.metric_type == "blood_pressure_diastolic":
            latest_metrics["diastolic"] = int(m.value)
        elif m.metric_type == "heart_rate":
            latest_metrics["heart_rate"] = int(m.value)

    # Combine systolic/diastolic into blood_pressure string
    if "systolic" in latest_metrics and "diastolic" in latest_metrics:
        latest_metrics["blood_pressure"] = f"{latest_metrics.pop('systolic')}/{latest_metrics.pop('diastolic')}"
    else:
        latest_metrics.pop("systolic", None)
        latest_metrics.pop("diastolic", None)

    # Recent document flags
    docs_result = await db.execute(
        select(MedicalDocument)
        .where(MedicalDocument.user_id == member_uuid, MedicalDocument.ai_flags.isnot(None))
        .order_by(MedicalDocument.created_at.desc())
        .limit(3)
    )
    docs = docs_result.scalars().all()

    recent_flags = []
    for doc in docs:
        if doc.ai_flags:
            for flag in doc.ai_flags[:2]:
                recent_flags.append(flag)

    return {
        "member_id": str(member_uuid),
        "member_name": member.name,
        "latest_metrics": latest_metrics,
        "recent_flags": recent_flags[:5],
    }


@router.post("/menu/generate")
async def generate_menu(current_user: CurrentUser, db: DB):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="Not in a family")

    from app.tasks.ai_tasks import generate_family_menu_task
    generate_family_menu_task.delay(str(current_user.family_id))
    return {"message": "Menu generation started. Check back in 30 seconds."}
