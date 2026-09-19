"""Enrollment API routes — face capture, quality check, embedding generation.

Supports capturing 5-10 samples per student via webcam with real-time quality feedback.
"""

from __future__ import annotations

import io
import base64
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.utils.dependencies import get_current_user, require_role
from app.models.user import User
from app.services.enrollment_service import EnrollmentService
from app.repositories.repository_core import StudentRepository
from app.utils.logging import logger

router = APIRouter(prefix="/api/enrollment", tags=["enrollment"])


@router.post("/capture")
def capture_enrollment_frame(
    student_id: int = Form(...),
    image_data: str = Form(...),  # base64-encoded JPEG
    capture_index: int = Form(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    """Receive a captured frame, check quality, generate embedding, store it."""
    service = EnrollmentService(db)
    return service.capture_frame(
        student_id=student_id,
        image_data=image_data,
        capture_index=capture_index,
    )


@router.post("/quality-check")
def quality_check_frame(
    image_data: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check face quality in a frame WITHOUT saving anything.

    Used by the enrollment modal to give live green/yellow/red feedback
    before auto-capturing. Runs face detection + quality gate only.
    """
    service = EnrollmentService(db)
    return service.check_quality(image_data=image_data)


@router.get("/status/{student_id}")
def get_enrollment_status(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get enrollment progress for a student."""
    student_repo = StudentRepository(db)
    student = student_repo.get(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    from app.repositories.repository_core import FaceEmbeddingRepository
    emb_repo = FaceEmbeddingRepository(db)
    embeddings = emb_repo.get_by_student(student_id)

    return {
        "student_id": student_id,
        "full_name": student.full_name,
        "enrollment_count": student.enrollment_count,
        "embeddings": [
            {
                "id": e.id,
                "quality_label": e.quality_label,
                "quality_reason": e.quality_reason,
                "capture_index": e.capture_index,
                "created_at": str(e.created_at),
            }
            for e in embeddings
        ],
    }