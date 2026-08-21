"""Attendance record — one per student per session (DB-enforced unique)."""

from __future__ import annotations

import datetime
from typing import Optional

from sqlalchemy import (
    String, DateTime, Integer, Float, Boolean, ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    LATE = "late"
    ABSENT_UNMARKED = "absent-unmarked"
    MANUAL = "manual"


class RecognitionDecision(str, enum.Enum):
    MATCH = "match"
    LOW_CONFIDENCE = "low_confidence"
    UNKNOWN = "unknown"
    QUALITY_REJECT = "quality_reject"
    ENTRY_ZONE_REJECT = "entry_zone_reject"
    LIVENESS_FAIL = "liveness_fail"
    NOT_RECOGNIZED = "not_recognized"


class AttendanceRecord(Base):
    """One record per student per attendance session.

    DB-level unique constraint (student_id + session_id) prevents
    duplicate attendance — never rely on frontend logic alone.
    """

    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint(
            "student_id", "session_id", name="uq_student_session"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    session_id: Mapped[int] = mapped_column(
        ForeignKey("attendance_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[AttendanceStatus] = mapped_column(
        SAEnum(AttendanceStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=AttendanceStatus.ABSENT_UNMARKED,
    )
    recognition_decision: Mapped[RecognitionDecision] = mapped_column(
        SAEnum(
            RecognitionDecision, values_callable=lambda x: [e.value for e in x]
        ),
        nullable=False,
        default=RecognitionDecision.NOT_RECOGNIZED,
    )
    similarity_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    quality_label: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    entry_zone_result: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    liveness_result: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    is_corrected: Mapped[bool] = mapped_column(Boolean, default=False)
    corrected_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    captured_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    # relationships
    student: Mapped["Student"] = relationship("Student", back_populates="attendance_records")
    session: Mapped["AttendanceSession"] = relationship(
        "AttendanceSession", back_populates="records"
    )

    def __repr__(self) -> str:
        return (
            f"<AttendanceRecord {self.id}: "
            f"student={self.student_id} session={self.session_id} "
            f"status={self.status.value}>"
        )