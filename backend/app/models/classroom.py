"""Classroom model."""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import String, Integer, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Classroom(Base):
    __tablename__ = "classrooms"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    floor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    capacity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Entry-zone: (x1, y1, x2, y2) as fraction of frame size (0–1)
    entry_zone_x1: Mapped[float] = mapped_column(Float, default=0.2)
    entry_zone_y1: Mapped[float] = mapped_column(Float, default=0.2)
    entry_zone_x2: Mapped[float] = mapped_column(Float, default=0.8)
    entry_zone_y2: Mapped[float] = mapped_column(Float, default=0.8)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    sessions: Mapped[List["AttendanceSession"]] = relationship(
        "AttendanceSession", back_populates="classroom"
    )

    def __repr__(self) -> str:
        return f"<Classroom {self.code}: {self.name}>"