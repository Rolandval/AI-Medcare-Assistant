"""User schemas"""

from datetime import date
from typing import Optional
from pydantic import BaseModel


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    occupation: Optional[str] = None
    lifestyle: Optional[str] = None
    location_city: Optional[str] = None
    morning_survey_hour: Optional[int] = None
    morning_survey_minute: Optional[int] = None
    evening_survey_hour: Optional[int] = None
    evening_survey_minute: Optional[int] = None
    notifications_enabled: Optional[bool] = None


class HealthProfileUpdate(BaseModel):
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    blood_type: Optional[str] = None
    chronic_conditions: Optional[list] = None
    allergies: Optional[list] = None
    current_medications: Optional[list] = None
    past_surgeries: Optional[list] = None
    physical_features: Optional[list] = None
    professional_risks: Optional[list] = None
    health_goals: Optional[list] = None
    additional_notes: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: Optional[str]
    birth_date: Optional[date]
    gender: Optional[str]
    occupation: Optional[str]
    lifestyle: Optional[str]
    location_city: Optional[str]
    avatar_url: Optional[str]
    family_id: Optional[str]
    is_family_admin: bool

    model_config = {"from_attributes": True}
