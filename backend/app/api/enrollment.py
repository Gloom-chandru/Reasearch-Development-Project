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
from app.models.student import Student
from app.services.recognition_service import RecognitionService
from app.services.quality_gate import QualityGate
from app.services.face_detector import detect_faces
from app.repositories.repository_core import StudentRepository
from app.utils.logging import logger

router = APIRouter(prefix="/api/enrollment", tags=["enrollment"])


@router.post("/capture")
def capture_enrollment_frame(
    student_id: int,
    image_data: str = Form(...),  # base64-encoded JPEG
    capture_index: int = Form(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    """Receive a captured frame, check quality, generate embedding, store it.

    Args:
        student_id: The student's database ID
        image_data: Base64-encoded JPEG image from webcam
        capture_index: Which capture this is (0-based)

    Returns:
        {"success": bool, "quality": {...}, "embedding_id": int or None, ...}
    """
    student_repo = StudentRepository(db)
    student = student_repo.get(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if not student.is_active:
        raise HTTPException(status_code=400, detail="Student is inactive")

    # Decode base64 image
    try:
        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Failed to decode image")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

    # Check for single face
    faces = detect_faces(frame)
    if len(faces) == 0:
        return {"success": False, "reason": "No face detected", "quality": None}
    if len(faces) > 1:
        return {"success": False, "reason": f"Multiple faces ({len(faces)}), single face required", "quality": None}

    face = faces[0]
    face_box = face["box"]
    landmarks = face.get("landmarks")

    # Quality gate (stricter for enrollment)
    gate = QualityGate()
    quality = gate.check_face(frame, face_box, landmarks, is_enrollment=True)

    if not quality.passed():
        return {
            "success": False,
            "reason": f"Quality reject: {quality.reason}",
            "quality": {"label": quality.label, "reason": quality.reason},
        }

    # Generate and store embedding
    rec_service = RecognitionService(db)
    embedding_id = rec_service.enroll_face(
        student_id=student_id,
        frame=frame,
        quality_label=quality.label,
        quality_reason=quality.reason,
        capture_index=capture_index,
    )

    if embedding_id is None:
        return {
            "success": False,
            "reason": "Face detected but embedding generation failed",
            "quality": {"label": quality.label, "reason": quality.reason},
        }

    return {
        "success": True,
        "embedding_id": embedding_id,
        "capture_index": capture_index,
        "quality": {"label": quality.label, "reason": quality.reason},
        "student_id": student_id,
        "total_enrolled": student.enrollment_count + 1,
    }


@router.post("/quality-check")
def quality_check_frame(
    image_data: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check face quality in a frame WITHOUT saving anything.

    Used by the enrollment modal to give live green/yellow/red feedback
    before auto-capturing. Runs face detection + quality gate only.

    Returns:
        {
            "face_found": bool,
            "face_count": int,
            "quality_label": "GOOD" | "ACCEPTABLE" | "REJECT" | null,
            "quality_reason": str,
            "face_box": [x, y, w, h] | null,
            "confidence": float | null,
        }
    """
    try:
        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"face_found": False, "face_count": 0, "quality_label": None,
                    "quality_reason": "Could not decode image", "face_box": None, "confidence": None}
    except Exception as e:
        return {"face_found": False, "face_count": 0, "quality_label": None,
                "quality_reason": f"Invalid image: {e}", "face_box": None, "confidence": None}

    faces = detect_faces(frame)
    if len(faces) == 0:
        return {"face_found": False, "face_count": 0, "quality_label": None,
                "quality_reason": "No face detected — look at the camera",
                "face_box": None, "confidence": None}
    if len(faces) > 1:
        return {"face_found": False, "face_count": len(faces), "quality_label": "REJECT",
                "quality_reason": f"Multiple faces ({len(faces)}) — only one person in frame",
                "face_box": None, "confidence": None}

    face = faces[0]
    gate = QualityGate()
    quality = gate.check_face(frame, face["box"], face.get("landmarks"), is_enrollment=True)

    x, y, w, h = face["box"]
    return {
        "face_found": True,
        "face_count": 1,
        "quality_label": quality.label,
        "quality_reason": quality.reason,
        "face_box": [x, y, w, h],
        "confidence": round(float(face.get("confidence", 0)), 3),
    }


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