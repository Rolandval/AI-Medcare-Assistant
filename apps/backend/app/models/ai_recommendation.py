"""AI Recommendation model"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, ForeignKey, DateTime, func, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin


class AIRecommendation(UUIDMixin, Base):
    __tablename__ = "ai_recommendations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Type: daily_brief | weekly_report | alert | nutrition | exercise |
    #       mental | sleep | work_life | urgent
    rec_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)

    # Which agents contributed
    agents_used: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)

    # Content structured
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # {
    #   "summary": "Загальний стан задовільний...",
    #   "urgent_alerts": [],
    #   "recommendations": [
    #     {"category": "nutrition", "text": "...", "priority": "high"},
    #     {"category": "exercise", "text": "...", "priority": "medium"},
    #   ],
    #   "specialists_notes": {
    #     "therapist": "...",
    #     "nutritionist": "..."
    #   }
    # }

    # Status
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relation
    user: Mapped["User"] = relationship("User", back_populates="ai_recommendations")
