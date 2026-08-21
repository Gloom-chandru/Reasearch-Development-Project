"""Attendance session model — one row per scheduled class."""

from __future__ import annotations

import datetime
from typing import Optional, List

from sqlalchemy import (
    String, DateTime, Integer, Boolean, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base


class SessionStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    classroom_id: Mapped[int] = mapped_column(
        ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    faculty_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    scheduled_start: Mapped[datetime.datetime] = mapped_column(
        DateTime, nullable=False
    )
    scheduled_end: Mapped[datetime.datetime] = mapped_column(
        DateTime, nullable=False
    )
    late_start_offset: Mapped[int] = mapped_column(
        Integer, default=5
    )  # minutes after start = LATE
    late_end_offset: Mapped[int] = mapped_column(
        Integer, default=15
    )  # minutes before end = LATE window ends
    status: Mapped[SessionStatus] = mapped_column(
        SAEnum(SessionStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=SessionStatus.SCHEDULED,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    # relationships
    classroom: Mapped["Classroom"] = relationship("Classroom", back_populates="sessions")
    subject: Mapped["Subject"] = relationship("Subject", back_populates="sessions")
    records: Mapped[List["AttendanceRecord"]] = relationship(
        "AttendanceRecord", back_populates="session"
    )

    def __repr__(self) -> str:
        return (
            f"<Session {self.id}: {self.title} "
            f"[{self.status.value}] {self.scheduled_start.date()}>"
        )