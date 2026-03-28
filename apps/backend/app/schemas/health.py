"""Health metric + survey schemas"""

import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class MetricCreate(BaseModel):
    metric_type: str
    value: float
    unit: str
    source: str = "manual"
    recorded_at: Optional[datetime] = None


class MetricResponse(BaseModel):
    id: uuid.UUID
    metric_type: str
    value: float
    unit: str
    source: str
    recorded_at: datetime

    model_config = {"from_attributes": True}


class SurveyCreate(BaseModel):
    survey_type: str  # morning | evening
    wellbeing_score: Optional[int] = Field(None, ge=1, le=10)
    mood: Optional[str] = None
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[int] = Field(None, ge=1, le=5)
    wake_feeling: Optional[str] = None
    energy_level: Optional[int] = Field(None, ge=1, le=10)
    stress_level: Optional[str] = None
    physical_activity: Optional[str] = None
    activity_minutes: Optional[int] = None
    pain_locations: Optional[List[str]] = None
    symptoms: Optional[List[str]] = None
    temperature: Optional[float] = None
    notes: Optional[str] = None


class SurveyResponse(BaseModel):
    id: uuid.UUID
    survey_type: str
    survey_date: datetime
    wellbeing_score: Optional[int]
    mood: Optional[str]
    sleep_hours: Optional[float]
    energy_level: Optional[int]
    stress_level: Optional[str]
    pain_locations: Optional[list]
    created_at: datetime

    model_config = {"from_attributes": True}
