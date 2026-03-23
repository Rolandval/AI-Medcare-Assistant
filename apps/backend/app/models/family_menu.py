"""Family Menu model — weekly meal plan for entire family"""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin


class FamilyMenu(UUIDMixin, Base):
    __tablename__ = "family_menus"

    family_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True
    )

    week_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Full weekly menu
    menu_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # {
    #   "monday": {
    #     "breakfast": {"name": "Вівсянка з бананом", "recipe_url": "...", "members": ["all"]},
    #     "lunch": {...},
    #     "dinner": {...}
    #   },
    #   "tuesday": { ... },
    #   ...
    # }

    # Shopping list for the whole week
    shopping_list: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    # {
    #   "vegetables": ["морква 500г", "броколі 300г"],
    #   "meat": ["куряче філе 1кг"],
    #   "dairy": ["кефір 1л"],
    #   "grains": ["вівсянка 500г"],
    #   "other": [...]
    # }

    # Who can eat what (optimized shared cooking)
    optimization_notes: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relation
    family: Mapped["Family"] = relationship("Family", back_populates="menus")
