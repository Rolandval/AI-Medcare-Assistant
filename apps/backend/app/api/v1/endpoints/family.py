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


@router.post("/menu/generate")
async def generate_menu(current_user: CurrentUser, db: DB):
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="Not in a family")

    from app.tasks.ai_tasks import generate_family_menu_task
    generate_family_menu_task.delay(str(current_user.family_id))
    return {"message": "Menu generation started. Check back in 30 seconds."}
