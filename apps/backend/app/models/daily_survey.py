"""Daily Survey model — morning/evening questionnaires"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, func, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin


class DailySurvey(UUIDMixin, Base):
    __tablename__ = "daily_surveys"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    survey_type: Mapped[str] = mapped_column(String(10), nullable=False)  # morning | evening
    survey_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    # Common
    wellbeing_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-10
    mood: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # terrible/bad/neutral/good/great

    # Morning specific
    sleep_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sleep_quality: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-5
    wake_feeling: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Evening specific
    energy_level: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-10
    stress_level: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # low/medium/high
    physical_activity: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    activity_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Symptoms
    pain_locations: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)
    # e.g. ["head", "back", "stomach", "joints"]
    symptoms: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)

    # Free text
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Temperature if measured
    temperature: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relation
    user: Mapped["User"] = relationship("User", back_populates="daily_surveys")
