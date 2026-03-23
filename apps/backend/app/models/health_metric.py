"""Health Metric model — time-series measurements"""

import uuid
from datetime import datetime

from sqlalchemy import String, Float, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin


class HealthMetric(UUIDMixin, Base):
    __tablename__ = "health_metrics"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Metric type: blood_pressure_systolic, blood_pressure_diastolic,
    #              heart_rate, weight, temperature, blood_glucose,
    #              oxygen_saturation, steps, sleep_hours, hrv, ...
    metric_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)  # mmHg, bpm, kg, °C, mg/dL, %

    source: Mapped[str] = mapped_column(String(30), default="manual")
    # manual | smartwatch | tonometer | glucometer | import

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relation
    user: Mapped["User"] = relationship("User", back_populates="health_metrics")
