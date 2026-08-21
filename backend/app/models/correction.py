"""Correction audit trail — who changed what, why, when."""

from __future__ import annotations

import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Correction(Base):
    __tablename__ = "corrections"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    record_id: Mapped[int] = mapped_column(
        ForeignKey("attendance_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    corrected_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    old_status: Mapped[str] = mapped_column(String(30), nullable=False)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    old_decision: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    new_decision: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def __repr__(self) -> str:
        return (
            f"<Correction {self.id}: record={self.record_id} "
            f"{self.old_status}→{self.new_status}>"
        )