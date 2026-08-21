"""Attendance record schemas."""

from __future__ import annotations

import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AttendanceRecordResponse(BaseModel):
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

    class Config:
        from_attributes = True


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