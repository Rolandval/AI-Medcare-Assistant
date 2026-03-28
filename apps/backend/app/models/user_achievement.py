"""User Achievement — unlocked achievements/badges"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class UserAchievement(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "user_achievements"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Achievement key: first_step, week_streak, marathon, photographer, etc.
    achievement_key: Mapped[str] = mapped_column(String(50), nullable=False)

    # When it was unlocked
    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # Relation
    user: Mapped["User"] = relationship("User", back_populates="achievements")
