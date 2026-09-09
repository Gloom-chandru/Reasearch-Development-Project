"""Attendance record schemas."""

from __future__ import annotations

import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AttendanceRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    session_id: int
    status: str
    recognition_decision: str
    similarity_score: Optional[float]
    quality_label: Optional[str]
    entry_zone_result: Optional[str]
    liveness_result: Optional[str]
    is_corrected: bool
    corrected_by: Optional[int]
    captured_at: datetime.datetime
    created_at: datetime.datetime
    # Nested student info via relationship
    student_register_number: Optional[str] = None
    student_name: Optional[str] = None

    @classmethod
    def from_orm_with_student(cls, record, student=None) -> "AttendanceRecordResponse":
        """Build the response from a SQLAlchemy record + optional student."""
        # Normalize enum values
        def _val(v):
            return v.value if hasattr(v, "value") else v

        return cls(
            id=record.id,
            student_id=record.student_id,
            session_id=record.session_id,
            status=_val(record.status),
            recognition_decision=_val(record.recognition_decision),
            similarity_score=record.similarity_score,
            quality_label=record.quality_label,
            entry_zone_result=record.entry_zone_result,
            liveness_result=record.liveness_result,
            is_corrected=record.is_corrected,
            corrected_by=record.corrected_by,
            captured_at=record.captured_at,
            created_at=record.created_at,
            student_register_number=student.register_number if student else None,
            student_name=student.full_name if student else None,
        )


class AttendanceListResponse(BaseModel):
    total: int
    present: int
    late: int
    absent: int
    records: list[AttendanceRecordResponse]


class AttendanceCorrectionRequest(BaseModel):
    record_id: int
    new_status: str = Field(..., pattern="^(present|late|absent-unmarked|manual)$")
    reason: str = Field(..., min_length=1, max_length=500)