"""ClassroomEnrollment — maps which students are enrolled in which classroom/subject.

This is essential for:
- Computing absent-unmarked at session close (students who never showed up)
- Attendance percentage calculation
- Session-level enrollment stats

A student can be enrolled in multiple classroom/subject combinations.
"""

from __future__ import annotations

import datetime
from typing import Optional

from sqlalchemy import (
    ForeignKey, UniqueConstraint, DateTime, Boolean, Integer, String
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ClassroomEnrollment(Base):
    """Maps a student to a classroom+subject combination.

    Unique constraint: one student, one classroom, one subject.
    A student can be in multiple classrooms/subjects (different rows).
    """

    __tablename__ = "classroom_enrollments"
    __table_args__ = (
        UniqueConstraint(
            "student_id", "classroom_id", "subject_id",
            name="uq_student_classroom_subject",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    classroom_id: Mapped[int] = mapped_column(
        ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Section within this classroom (e.g. "A", "B") - optional override
    section: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    enrolled_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    # relationships
    student: Mapped["Student"] = relationship("Student", back_populates="classroom_enrollments")
    classroom: Mapped["Classroom"] = relationship("Classroom", back_populates="enrollments")

    def __repr__(self) -> str:
        return (
            f"<ClassroomEnrollment student={self.student_id} "
            f"classroom={self.classroom_id} subject={self.subject_id}>"
        )
