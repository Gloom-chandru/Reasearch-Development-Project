"""Enrollment service — business logic for face capture, quality gates, and embedding storage."""

from __future__ import annotations

import base64
from typing import Dict, Optional

import cv2
import numpy as np
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.repository_core import StudentRepository
from app.services.face_detector import detect_faces
from app.services.quality_gate import QualityGate
from app.services.recognition_service import RecognitionService
from app.utils.logging import logger


class EnrollmentService:
    def __init__(self, db: Session):
        self.db = db
        self.student_repo = StudentRepository(db)
        self.rec_service = RecognitionService(db)
        self.quality_gate = QualityGate()

    def capture_frame(
        self,
        student_id: int,
        image_data: str,
        capture_index: int = 0,
    ) -> Dict:
        """Process captured frame, check quality, generate embedding, and persist."""
        student = self.student_repo.get(student_id)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        if not student.is_active:
            raise HTTPException(status_code=400, detail="Student is inactive")

        # Decode base64 image
        try:
            if "," in image_data:
                image_data = image_data.split(",", 1)[1]
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
            return {
                "success": False,
                "reason": f"Multiple faces ({len(faces)}), single face required",
                "quality": None,
            }

        face = faces[0]
        face_box = face["box"]
        landmarks = face.get("landmarks")

        # Quality gate (stricter for enrollment)
        quality = self.quality_gate.check_face(frame, face_box, landmarks, is_enrollment=True)
        if not quality.passed():
            return {
                "success": False,
                "reason": f"Quality reject: {quality.reason}",
                "quality": {"label": quality.label, "reason": quality.reason},
            }

        # Generate and store embedding
        embedding_id = self.rec_service.enroll_face(
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

    def check_quality(self, image_data: str) -> Dict:
        """Check face quality in frame without persisting (for live UI feedback)."""
        try:
            if "," in image_data:
                image_data = image_data.split(",", 1)[1]
            image_bytes = base64.b64decode(image_data)
            np_arr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                return {
                    "face_found": False,
                    "face_count": 0,
                    "quality_label": None,
                    "quality_reason": "Could not decode image",
                    "face_box": None,
                    "confidence": None,
                }
        except Exception as e:
            return {
                "face_found": False,
                "face_count": 0,
                "quality_label": None,
                "quality_reason": f"Invalid image: {e}",
                "face_box": None,
                "confidence": None,
            }

        faces = detect_faces(frame)
        if len(faces) == 0:
            return {
                "face_found": False,
                "face_count": 0,
                "quality_label": None,
                "quality_reason": "No face detected — look at the camera",
                "face_box": None,
                "confidence": None,
            }
        if len(faces) > 1:
            return {
                "face_found": True,
                "face_count": len(faces),
                "quality_label": "REJECT",
                "quality_reason": f"Multiple faces ({len(faces)}) — only 1 person permitted",
                "face_box": faces[0]["box"],
                "confidence": faces[0].get("confidence"),
            }

        face = faces[0]
        q = self.quality_gate.check_face(
            frame, face["box"], face.get("landmarks"), is_enrollment=True
        )

        return {
            "face_found": True,
            "face_count": 1,
            "quality_label": q.label,
            "quality_reason": q.reason,
            "face_box": face["box"],
            "confidence": face.get("confidence"),
        }
