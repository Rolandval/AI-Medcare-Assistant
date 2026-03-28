"""AI Feed Card — individual cards from AI doctor agents"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, ForeignKey, DateTime, func, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class AICard(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ai_cards"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Which AI doctor generated this card
    doctor_id: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    # therapist, nutritionist, trainer, psychologist, pharmacist, cardiologist, orthopedist

    # Card type
    card_type: Mapped[str] = mapped_column(String(30), nullable=False)
    # insight, challenge, survey, meal_suggestion, achievement, alert, report, chat_prompt

    # Which round: morning, afternoon, evening, on_demand
    round_type: Mapped[str] = mapped_column(String(20), nullable=False, default="morning")

    # Card content
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)

    # Structured data (suggestions, options, chart data, etc.)
    metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    # Examples:
    # challenge: { "deadline": "15:00", "streak": 5 }
    # meal_suggestion: { "suggestions": [{"name": "Омлет", "protein_g": 25, "calories": 300}] }
    # survey: { "questions": [{"type": "emoji", "key": "mood"}, {"type": "number", "key": "sleep_hours"}] }
    # achievement: { "key": "week_streak", "points": 50, "icon": "🏆" }

    # What action the card expects
    action_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    # done, dismiss, remind, chat, photo, measure, survey_submit

    # User interaction status
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    # pending, seen, acted, dismissed, expired

    acted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Card relevance window
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relation
    user: Mapped["User"] = relationship("User", back_populates="ai_cards")
