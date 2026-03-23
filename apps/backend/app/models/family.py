"""Family model"""

import uuid
from typing import List, Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class Family(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "families"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    invite_code: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True)

    # Relations
    members: Mapped[List["User"]] = relationship("User", back_populates="family", lazy="selectin")
    menus: Mapped[List["FamilyMenu"]] = relationship("FamilyMenu", back_populates="family")
