"""Session service — attendance session lifecycle management."""

from __future__ import annotations

import asyncio
import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.repository_sessions import (
    AttendanceSessionRepository,
    AttendanceRecordRepository,
    ClassroomRepository,
    SubjectRepository,
)
from app.repositories.repository_core import ClassroomEnrollmentRepository
from app.repositories.repository_logging import AuditLogRepository, SystemEventRepository
from app.schemas.session import SessionCreate, SessionUpdate
from app.utils.logging import logger


def _run_async(coro):
    """Fire-and-forget an async coroutine from sync context safely."""
    try:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(coro)
        except RuntimeError:
            asyncio.run(coro)
    except Exception as e:
        logger.debug(f"_run_async failed: {e}")


class SessionService:
    def __init__(self, db: Session):
        self.db = db
        self.session_repo = AttendanceSessionRepository(db)
        self.record_repo = AttendanceRecordRepository(db)
        self.classroom_repo = ClassroomRepository(db)
        self.subject_repo = SubjectRepository(db)
        self.enrollment_repo = ClassroomEnrollmentRepository(db)
        self.audit_repo = AuditLogRepository(db)
        self.system_event_repo = SystemEventRepository(db)

    def _write_audit(self, user_id, action, entity_type, entity_id, details=""):
        try:
            self.audit_repo.create(
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details=details,
            )
        except Exception as e:
            logger.warning(f"Audit log write failed: {e}")

    def _write_system_event(self, source, level, message, details=""):
        try:
            self.system_event_repo.create(
                source=source,
                level=level,
                message=message,
                details=details,
            )
        except Exception as e:
            logger.warning(f"System event write failed: {e}")

    def create_session(self, data: SessionCreate, user_id: int = None):
        classroom = self.classroom_repo.get(data.classroom_id)
        if not classroom:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found"
            )
        subject = self.subject_repo.get(data.subject_id)
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found"
            )
        if data.scheduled_start >= data.scheduled_end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="scheduled_start must be before scheduled_end",
            )
        session = self.session_repo.create(**data.model_dump())
        if user_id:
            self._write_audit(user_id, "create", "attendance_session", session.id,
                              f"Created session '{session.title}'")
        logger.info(f"Created session: {session.title} [{session.status}]")
        return session

    def get_session(self, session_id: int):
        session = self.session_repo.get(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
            )
        return session

    def list_sessions(self, skip: int = 0, limit: int = 100, **filters):
        sessions = self.session_repo.list(skip=skip, limit=limit, **filters)
        return {"total": len(sessions), "sessions": sessions}

    def update_session(self, session_id: int, data: SessionUpdate, user_id: int = None):
        session = self.session_repo.update(
            session_id, **data.model_dump(exclude_none=True)
        )
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
            )
        if user_id:
            self._write_audit(user_id, "update", "attendance_session", session_id)
        return session

    def activate_session(self, session_id: int, user_id: int = None):
        session = self.session_repo.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if session.status == "active":
            raise HTTPException(status_code=400, detail="Session is already active")
        if session.status == "completed":
            raise HTTPException(status_code=400, detail="Cannot re-activate a completed session")
        session.status = "active"
        self.db.commit()
        logger.info(f"Activated session: {session_id}")
        if user_id:
            self._write_audit(user_id, "activate", "attendance_session", session_id)
        self._write_system_event(
            "session_service", "info",
            f"Session activated: {session.title}",
            f"classroom_id={session.classroom_id}",
        )
        # Broadcast session_state change to classroom display
        try:
            from app.services.websocket_manager import manager
            _run_async(manager.broadcast_session_state(
                classroom_id=session.classroom_id,
                session_id=session_id,
                status="active",
                title=session.title,
            ))
        except Exception as e:
            logger.warning(f"WebSocket broadcast on activate failed: {e}")
        return session

    def complete_session(self, session_id: int, user_id: int = None):
        session = self.session_repo.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if session.status == "completed":
            raise HTTPException(status_code=400, detail="Session already completed")

        # --- Write absent-unmarked records for enrolled students who never appeared ---
        absent_count = self._finalize_absent_records(session)

        session.status = "completed"
        self.db.commit()
        logger.info(f"Completed session: {session_id} ({absent_count} absent-unmarked written)")
        if user_id:
            self._write_audit(user_id, "complete", "attendance_session", session_id,
                              f"Finalized. {absent_count} absent-unmarked records created.")
        self._write_system_event(
            "session_service", "info",
            f"Session completed: {session.title}",
            f"classroom_id={session.classroom_id} absent_count={absent_count}",
        )
        # Broadcast session_state to classroom display
        try:
            from app.services.websocket_manager import manager
            _run_async(manager.broadcast_session_state(
                classroom_id=session.classroom_id,
                session_id=session_id,
                status="completed",
                title=session.title,
            ))
        except Exception as e:
            logger.warning(f"WebSocket broadcast on complete failed: {e}")
        return session

    def _finalize_absent_records(self, session) -> int:
        """For every enrolled student with no attendance record, write absent-unmarked.

        If no enrollment records exist for this classroom+subject (i.e. enrollment
        feature is not yet used), we skip silently — we can't fabricate absent
        records for students we don't know are expected.
        """
        enrolled = self.enrollment_repo.get_enrolled_students(
            classroom_id=session.classroom_id,
            subject_id=session.subject_id,
        )
        if not enrolled:
            # Enrollment table not populated for this session — can't determine absent
            logger.info(
                f"Session {session.id}: No classroom enrollments found; "
                "absent-unmarked records not written (enrollment list empty)."
            )
            return 0

        existing_records = self.record_repo.get_records_by_session(session.id)
        recorded_student_ids = {r.student_id for r in existing_records}

        absent_count = 0
        for enrollment in enrolled:
            if enrollment.student_id not in recorded_student_ids:
                try:
                    self.record_repo.create(
                        student_id=enrollment.student_id,
                        session_id=session.id,
                        status="absent-unmarked",
                        recognition_decision="not_recognized",
                    )
                    absent_count += 1
                except Exception as e:
                    logger.warning(
                        f"Could not write absent-unmarked for student={enrollment.student_id}: {e}"
                    )
        return absent_count
