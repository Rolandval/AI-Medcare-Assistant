"""Pydantic schemas for AI Feed, Cards, Chat, Gamification, Meals, Documents"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ---- AI Cards ----

class AICardResponse(BaseModel):
    id: str
    doctor_id: str
    doctor_name: str
    doctor_emoji: str
    doctor_color: str
    card_type: str
    round_type: str
    title: str
    body: str
    metadata: Optional[dict] = None
    action_type: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class CardActionRequest(BaseModel):
    action: str  # acted | dismissed | survey_submit | remind
    survey_data: Optional[dict] = None


class CardActionResponse(BaseModel):
    status: str
    new_achievements: list[dict] = []


# ---- Doctor Profile ----

class DoctorResponse(BaseModel):
    id: str
    name: str
    specialty: str
    emoji: str
    color: str
    personality: str
    motto: str


class DoctorProfileResponse(DoctorResponse):
    card_count: int = 0
    chat_count: int = 0
    recent_cards: list[dict] = []


# ---- Chat ----

class ChatMessageRequest(BaseModel):
    message: str


class ChatMessageResponse(BaseModel):
    id: str
    doctor_id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSyncResponse(BaseModel):
    message: ChatMessageResponse
    doctor_name: str
    doctor_emoji: str


# ---- Gamification ----

class HealthScoreResponse(BaseModel):
    total: int
    breakdown: dict


class StreakResponse(BaseModel):
    type: str
    label: str
    emoji: str
    current: int
    best: int
    last_date: Optional[str] = None
    active: bool


class AchievementResponse(BaseModel):
    key: str
    name: str
    description: str
    emoji: str
    points: int
    unlocked: bool
    unlocked_at: Optional[str] = None


class GamificationSummaryResponse(BaseModel):
    score: HealthScoreResponse
    streaks: list[StreakResponse]
    achievements: list[AchievementResponse]


# ---- Meals ----

class FoodItemResponse(BaseModel):
    name: str
    amount: Optional[str] = None
    calories: Optional[float] = None


class MealResponse(BaseModel):
    id: str
    meal_type: Optional[str] = None
    photo_url: Optional[str] = None
    description: Optional[str] = None
    calories: Optional[float] = None
    proteins_g: Optional[float] = None
    fats_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fiber_g: Optional[float] = None
    health_score: Optional[int] = None
    ai_comment: Optional[str] = None
    recognition_status: str = "pending"
    food_items: list[FoodItemResponse] = []
    confidence: Optional[float] = None
    eaten_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class DayTotalsResponse(BaseModel):
    calories: int = 0
    proteins_g: float = 0
    fats_g: float = 0
    carbs_g: float = 0


class MealsTodayResponse(BaseModel):
    meals: list[MealResponse]
    totals: DayTotalsResponse


# ---- Documents ----

class IndicatorResponse(BaseModel):
    name: str
    value: Optional[float] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: Optional[str] = None
    status_label: Optional[str] = None


class DocumentFlagResponse(BaseModel):
    indicator: str
    value: Optional[str] = None
    concern: Optional[str] = None


class DocumentResponse(BaseModel):
    id: str
    doc_type: str
    title: Optional[str] = None
    ocr_status: str
    ai_analysis: Optional[dict] = None
    ai_flags: Optional[list[DocumentFlagResponse]] = None
    parsed_data: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentDetailResponse(DocumentResponse):
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    indicators: list[IndicatorResponse] = []
    ai_summary: Optional[str] = None
    document_date: Optional[str] = None
    lab_name: Optional[str] = None


# ---- Family ----

class FamilyMemberResponse(BaseModel):
    id: str
    name: str
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    avatar_url: Optional[str] = None
    is_admin: bool = False


class FamilyResponse(BaseModel):
    id: str
    name: str
    invite_code: Optional[str] = None
    members: list[FamilyMemberResponse]


class MemberHealthResponse(BaseModel):
    member_id: str
    member_name: str
    latest_metrics: dict = {}
    recent_flags: list[dict] = []
