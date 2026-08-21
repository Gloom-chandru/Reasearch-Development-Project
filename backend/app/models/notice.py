"""Notice model — classroom display messages with auto-expiry."""

from __future__ import annotations

import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Integer, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Notice(Base):
    __tablename__ = "notices"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0)  # higher = more urgent
    classroom_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=True, index=True
    )
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    valid_from: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    valid_until: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime, nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    def __repr__(self) -> str:
        return f"<Notice {self.id}: {self.title}>"