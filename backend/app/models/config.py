"""Attendance configuration — per-classroom/section overrides."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import String, Integer, Float, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AttendanceConfiguration(Base):
    __tablename__ = "attendance_configurations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    classroom_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=True, index=True
    )
    section: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    recognition_threshold: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    min_face_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    blur_threshold: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    late_start_offset: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    late_end_offset: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    entry_zone_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    liveness_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    def __repr__(self) -> str:
        return f"<AttendanceConfiguration {self.id}>"