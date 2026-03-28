"""AI Chat Message — conversation history with AI doctors"""

import uuid
from typing import Optional

from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class AIChatMessage(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ai_chat_messages"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Which doctor this conversation is with
    doctor_id: Mapped[str] = mapped_column(String(30), nullable=False, index=True)

    # Message role: "user" or "assistant"
    role: Mapped[str] = mapped_column(String(10), nullable=False)

    # Message text
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Optional structured data (e.g., suggested actions, referenced cards)
    metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)

    # Relation
    user: Mapped["User"] = relationship("User", back_populates="chat_messages")
