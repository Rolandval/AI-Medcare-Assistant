"""User profile endpoints"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from sqlalchemy import select

from app.api.deps import DB, CurrentUser
from app.models.user import User
from app.models.health_profile import HealthProfile
from app.schemas.user import UserProfileUpdate, HealthProfileUpdate, UserResponse

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
        raise HTTPException(status_code=404, detail="Health profile not found")
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
