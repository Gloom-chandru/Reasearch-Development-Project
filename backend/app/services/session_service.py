"""Session service — attendance session lifecycle management."""

from __future__ import annotations

import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.repository_sessions import (
    AttendanceSessionRepository,
    ClassroomRepository,
    SubjectRepository,
)
from app.schemas.session import SessionCreate, SessionUpdate
from app.utils.logging import logger


class SessionService:
    def __init__(self, db: Session):
        self.db = db
        self.session_repo = AttendanceSessionRepository(db)
        self.classroom_repo = ClassroomRepository(db)
        self.subject_repo = SubjectRepository(db)

    def create_session(self, data: SessionCreate):
        # Validate classroom and subject exist
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

    def update_session(self, session_id: int, data: SessionUpdate):
        session = self.session_repo.update(
            session_id, **data.model_dump(exclude_none=True)
        )
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
            )
        return session

    def activate_session(self, session_id: int):
        session = self.session_repo.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        session.status = "active"
        self.db.commit()
        logger.info(f"Activated session: {session_id}")
        return session

    def complete_session(self, session_id: int):
        session = self.session_repo.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        # Freeze: mark absent-unmarked for all enrolled students without records
        session.status = "completed"
        self.db.commit()
        logger.info(f"Completed session: {session_id}")
        return session