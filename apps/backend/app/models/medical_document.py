"""Medical Document model — uploaded analyses, MRI, doctor notes"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, ForeignKey, DateTime, func, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin


class MedicalDocument(UUIDMixin, Base):
    __tablename__ = "medical_documents"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Type: blood_test | urine_test | stool_test | dna_analysis |
    #       mri | ct | ultrasound | xray | ecg | doctor_note |
    #       prescription | discharge | other
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    doc_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Storage
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    file_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(nullable=True)

    # AI Processing
    ocr_status: Mapped[str] = mapped_column(String(20), default="pending")
    # pending | processing | done | failed
    parsed_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # Structured extracted data (e.g., blood test values with units)

    ai_analysis: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # AI doctor analysis of the document

    ai_flags: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)
    # Critical values flagged by AI: [{"indicator": "hemoglobin", "value": 90, "status": "low"}]

    # Notes
    user_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relation
    user: Mapped["User"] = relationship("User", back_populates="medical_documents")
