"""Attendance service — record, correct, and finalize attendance."""

from __future__ import annotations

import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.repositories.repository_sessions import (
    AttendanceRecordRepository,
    AttendanceSessionRepository,
    CorrectionRepository,
)
from app.repositories.repository_core import StudentRepository
from app.schemas.attendance import AttendanceCorrectionRequest
from app.utils.logging import logger


class AttendanceService:
    def __init__(self, db: Session):
        self.db = db
        self.record_repo = AttendanceRecordRepository(db)
        self.session_repo = AttendanceSessionRepository(db)
        self.student_repo = StudentRepository(db)
        self.correction_repo = CorrectionRepository(db)
    def record_attendance(
        self,
        student_id: int,
        session_id: int,
        recognition_decision: str,
        similarity_score: Optional[float] = None,
        quality_label: Optional[str] = None,
        entry_zone_result: Optional[str] = None,
        liveness_result: Optional[str] = None,
    ):
        """Create an attendance record. DB constraint prevents duplicates."""
        session = self.session_repo.get(session_id)
        if not session or session.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session is not active",
            )
        student = self.student_repo.get(student_id)
        if not student or not student.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student not found or inactive",
            )

        # Determine status based on time
        now = datetime.datetime.utcnow()
        if now <= session.scheduled_start + datetime.timedelta(
            minutes=session.late_start_offset
        ):
            status_val = "present"
        elif now <= session.scheduled_end - datetime.timedelta(
            minutes=session.late_end_offset
        ):
            status_val = "late"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session time window has closed",
            )

        try:
            record = self.record_repo.create(
                student_id=student_id,
                session_id=session_id,
                status=status_val,
                recognition_decision=recognition_decision,
                similarity_score=similarity_score,
                quality_label=quality_label,
                entry_zone_result=entry_zone_result,
                liveness_result=liveness_result,
            )
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Duplicate attendance record — student already marked",
            )
        logger.info(
            f"Attendance recorded: student={student_id} session={session_id} "
            f"status={status_val} decision={recognition_decision}"
        )
        return record

    def correct_attendance(self, correction: AttendanceCorrectionRequest, user_id: int):
        record = self.record_repo.get(correction.record_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Record not found"
            )
        old_status = record.status.value if hasattr(record.status, 'value') else record.status
        old_decision = (
            record.recognition_decision.value
            if hasattr(record.recognition_decision, 'value')
            else record.recognition_decision
        )

        record.status = correction.new_status
        record.is_corrected = True
        record.corrected_by = user_id
        self.db.commit()

        # Create audit trail
        self.correction_repo.create(
            record_id=correction.record_id,
            corrected_by=user_id,
            old_status=old_status,
            new_status=correction.new_status,
            old_decision=old_decision,
            new_decision=old_decision,
            reason=correction.reason,
        )
        logger.info(
            f"Attendance corrected: record={correction.record_id} "
            f"{old_status}->{correction.new_status} by user={user_id}"
        )
        return record

    def get_session_records(self, session_id: int):
        session = self.session_repo.get(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
            )
        records = self.record_repo.get_records_by_session(session_id)
        stats = self.record_repo.get_stats_by_session(session_id)
        enriched = []
        for r in records:
            student = self.student_repo.get(r.student_id)
            enriched.append({
                "id": r.id,
                "student_id": r.student_id,
                "session_id": r.session_id,
                "status": r.status.value if hasattr(r.status, 'value') else r.status,
                "recognition_decision": r.recognition_decision.value if hasattr(r.recognition_decision, 'value') else r.recognition_decision,
                "similarity_score": r.similarity_score,
                "quality_label": r.quality_label,
                "entry_zone_result": r.entry_zone_result,
                "liveness_result": r.liveness_result,
                "is_corrected": r.is_corrected,
                "corrected_by": r.corrected_by,
                "captured_at": r.captured_at,
                "student_register_number": student.register_number if student else None,
                "student_name": student.full_name if student else None,
            })
        return {**stats, "records": enriched}