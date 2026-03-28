"""User model"""

import uuid
from datetime import date
from typing import Optional, List

from sqlalchemy import String, Boolean, Date, ForeignKey, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    # Auth
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    telegram_id: Mapped[Optional[int]] = mapped_column(BigInteger, unique=True, nullable=True, index=True)
    telegram_username: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Family
    family_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("families.id"), nullable=True
    )
    is_family_admin: Mapped[bool] = mapped_column(Boolean, default=False)

    # Personal
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    birth_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # male/female/other
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Lifestyle
    occupation: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    lifestyle: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # sedentary/active/mixed
    location_city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    location_country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="Ukraine")

    # Settings
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    morning_survey_hour: Mapped[int] = mapped_column(default=7)
    morning_survey_minute: Mapped[int] = mapped_column(default=30)
    evening_survey_hour: Mapped[int] = mapped_column(default=20)
    evening_survey_minute: Mapped[int] = mapped_column(default=0)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    expo_push_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relations
    family: Mapped[Optional["Family"]] = relationship("Family", back_populates="members")
    health_profile: Mapped[Optional["HealthProfile"]] = relationship(
        "HealthProfile", back_populates="user", uselist=False, lazy="selectin"
    )
    health_metrics: Mapped[List["HealthMetric"]] = relationship("HealthMetric", back_populates="user")
    daily_surveys: Mapped[List["DailySurvey"]] = relationship("DailySurvey", back_populates="user")
    medical_documents: Mapped[List["MedicalDocument"]] = relationship("MedicalDocument", back_populates="user")
    meals: Mapped[List["Meal"]] = relationship("Meal", back_populates="user")
    ai_recommendations: Mapped[List["AIRecommendation"]] = relationship("AIRecommendation", back_populates="user")
    medication_reminders: Mapped[List["MedicationReminder"]] = relationship("MedicationReminder", back_populates="user")
    ai_cards: Mapped[List["AICard"]] = relationship("AICard", back_populates="user")
    chat_messages: Mapped[List["AIChatMessage"]] = relationship("AIChatMessage", back_populates="user")
