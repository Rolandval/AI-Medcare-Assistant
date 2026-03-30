"""Medication reminder model"""

import uuid
from datetime import time
from typing import Optional

from sqlalchemy import String, Boolean, Time, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class MedicationReminder(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "medication_reminders"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    dosage: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Schedule
    times: Mapped[list] = mapped_column(JSONB, default=list)  # ["08:00", "14:00", "20:00"]
    days_of_week: Mapped[list] = mapped_column(JSONB, default=list)  # [0,1,2,3,4,5,6] = every day
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Tracking
    emoji: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, default="💊")

    # Relations
    user: Mapped["User"] = relationship("User", back_populates="medication_reminders")
