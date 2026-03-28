"""User Streak — tracks daily streaks for various activities"""

import uuid
from datetime import date
from typing import Optional

from sqlalchemy import String, ForeignKey, Integer, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class UserStreak(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "user_streaks"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Streak type: checkin, medication, meals, challenge
    streak_type: Mapped[str] = mapped_column(String(30), nullable=False)

    # Current consecutive streak count
    current_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # All-time best streak
    best_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Last date the streak was extended
    last_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Relation
    user: Mapped["User"] = relationship("User", back_populates="streaks")
