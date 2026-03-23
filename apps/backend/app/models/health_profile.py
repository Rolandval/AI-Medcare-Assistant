"""Health Profile model — static health data"""

import uuid
from typing import Optional

from sqlalchemy import String, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class HealthProfile(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "health_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    # Physical
    height_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    blood_type: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)  # A+, O-, etc.

    # Medical history
    chronic_conditions: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)
    allergies: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)
    current_medications: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)
    past_surgeries: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)

    # Physical features
    physical_features: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)
    # e.g. ["hyperlordosis", "scoliosis", "flat_feet"]

    # Professional risks
    professional_risks: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)
    # e.g. ["chemicals", "eye_strain", "sedentary", "radiation"]

    # Goals
    health_goals: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)

    # Extra context (free text)
    additional_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relation
    user: Mapped["User"] = relationship("User", back_populates="health_profile")
