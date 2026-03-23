"""Meal model — food photo analysis"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Float, ForeignKey, DateTime, func, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin


class Meal(UUIDMixin, Base):
    __tablename__ = "meals"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    meal_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # breakfast | lunch | dinner | snack

    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # AI recognition
    recognition_status: Mapped[str] = mapped_column(String(20), default="pending")
    # pending | processing | done | failed | manual

    ai_recognition: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # {
    #   "dishes": [{"name": "...", "portion_g": 200}],
    #   "total_calories": 450,
    #   "confidence": 0.85,
    #   "health_score": 7
    # }

    # Calculated nutrients
    calories: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    proteins_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fats_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    carbs_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fiber_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # AI health assessment
    health_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-10
    ai_comment: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    eaten_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relation
    user: Mapped["User"] = relationship("User", back_populates="meals")
