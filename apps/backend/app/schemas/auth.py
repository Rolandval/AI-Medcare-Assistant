"""Auth schemas"""

import uuid
from datetime import date
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserMeResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str | None = None
    telegram_id: int | None = None
    family_id: uuid.UUID | None = None
    is_family_admin: bool = False
    avatar_url: str | None = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    occupation: Optional[str] = None
    lifestyle: Optional[str] = None
    location_city: Optional[str] = None

    model_config = {"from_attributes": True}
