"""Camera pipeline — orchestrates the full recognition pipeline.

Frame → Detection → Quality Gate → Entry-Zone Gate → Embedding
  → Similarity → Threshold Decision → Liveness Check → Identity
  → Time-Window Classification → Duplicate Check → DB Write → WebSocket
"""

from __future__ import annotations

import datetime
import time
from typing import Optional, List

import cv2
import numpy as np
from sqlalchemy.orm import Session

from app.config import settings
from app.models.classroom import Classroom
from app.repositories.repository_sessions import (
    AttendanceRecordRepository,
    AttendanceSessionRepository,
)
from app.repositories.repository_core import StudentRepository
from app.services.face_detector import detect_faces
from app.services.quality_gate import QualityGate
from app.services.entry_zone import EntryZoneDetector
from app.services.recognition_service import RecognitionService
from app.services.liveness_service import LivenessDetector
from app.services.websocket_manager import manager
from app.utils.logging import logger


class PipelineResult:
    """Result of processing one face through the pipeline."""

    def __init__(
        self,
        identity: Optional[dict] = None,
        quality: Optional[dict] = None,
        entry_zone: Optional[dict] = None,
        liveness: Optional[dict] = None,
        recognition: Optional[dict] = None,
        attendance_record: Optional[dict] = None,
        latency: dict = None,
        rejected: bool = False,
        reject_reason: str = "",
    ):
        self.identity = identity or {}
        self.quality = quality or {}
        self.entry_zone = entry_zone or {}
        self.liveness = liveness or {}
        self.recognition = recognition or {}
        self.attendance_record = attendance_record
        self.latency = latency or {}
        self.rejected = rejected
        self.reject_reason = reject_reason

    def to_dict(self) -> dict:
        return {
            "identity": self.identity,
            "quality": self.quality,
            "entry_zone": self.entry_zone,
            "liveness": self.liveness,
            "recognition": self.recognition,
            "attendance_record": self.attendance_record,
            "latency": self.latency,
            "rejected": self.rejected,
            "reject_reason": self.reject_reason,
        }
class CameraPipeline:
    """Real-time face recognition pipeline with quality gating, entry zone, and liveness."""

    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.quality_gate = QualityGate()
        self.entry_zone = EntryZoneDetector()
        self.liveness = LivenessDetector()
        self._recognition_service = None
        self._student_repo = None
        self._session_repo = None
        self._record_repo = None
        self._classroom = None

    def _init_db_services(self, db: Session) -> None:
        self.db = db
        self._recognition_service = RecognitionService(db)
        self._student_repo = StudentRepository(db)
        self._session_repo = AttendanceSessionRepository(db)
        self._record_repo = AttendanceRecordRepository(db)

    def configure(self, classroom: Classroom) -> None:
        self._classroom = classroom
        self.entry_zone.configure(classroom)

    def reset_liveness(self) -> None:
        self.liveness.reset()

    def process_frame(
        self,
        frame: np.ndarray,
        session_id: int,
        capture_timestamp: Optional[datetime.datetime] = None,
    ) -> List[PipelineResult]:
        results = []
        timestamps = {"start": time.perf_counter()}
        faces = detect_faces(frame)
        timestamps["detection"] = time.perf_counter()
        if not faces:
            timestamps["end"] = time.perf_counter()
            return results
        h, w = frame.shape[:2]

        for face in faces:
            face_box = face["box"]
            landmarks = face.get("landmarks")
            result = PipelineResult()

            # Quality Gate
            quality_result = self.quality_gate.check_face(
                frame, face_box, landmarks, is_enrollment=False
            )
            result.quality = {"label": quality_result.label, "reason": quality_result.reason}
            timestamps["quality"] = time.perf_counter()
            if not quality_result.passed():
                result.rejected = True
                result.reject_reason = f"Quality reject: {quality_result.reason}"
                timestamps["end"] = time.perf_counter()
                result.latency = _compute_latencies(timestamps)
                results.append(result)
                continue

            # Entry Zone Gate
            if self._classroom:
                zone_result = self.entry_zone.check_face(face_box, w, h)
                result.entry_zone = zone_result
                timestamps["entry_zone"] = time.perf_counter()
                if not zone_result["inside"]:
                    result.rejected = True
                    result.reject_reason = zone_result["reason"]
                    timestamps["end"] = time.perf_counter()
                    result.latency = _compute_latencies(timestamps)
                    results.append(result)
                    continue

            # Liveness Check
            if landmarks is not None:
                landmarks_np = np.array(landmarks)
                liveness_result = self.liveness.process_frame(landmarks_np)
                result.liveness = liveness_result
            else:
                result.liveness = {"liveness": "uncertain", "reason": "No landmarks"}
            timestamps["liveness"] = time.perf_counter()
# Recognition
            if self._recognition_service:
                rec_result = self._recognition_service.identify(frame)
                result.recognition = rec_result
                result.identity = {
                    "student_id": rec_result["student_id"],
                    "similarity": rec_result["similarity"],
                    "decision": rec_result["decision"],
                }
            else:
                result.recognition = {"student_id": None, "decision": "no_model"}
                result.identity = {"student_id": None, "decision": "no_model"}
            timestamps["recognition"] = time.perf_counter()

            # Attendance Recording
            if self.db and rec_result.get("decision") == "match" and rec_result.get("student_id"):
                try:
                    session = self._session_repo.get(session_id)
                    if session and session.status == "active":
                        student = self._student_repo.get(rec_result["student_id"])
                        if student and student.is_active:
                            now = capture_timestamp or datetime.datetime.utcnow()
                            if now <= session.scheduled_start + datetime.timedelta(
                                minutes=session.late_start_offset
                            ):
                                status_val = "present"
                            else:
                                status_val = "late"
                            existing = self._record_repo.get_by_student_and_session(
                                rec_result["student_id"], session_id
                            )
                            if not existing:
                                record = self._record_repo.create(
                                    student_id=rec_result["student_id"],
                                    session_id=session_id,
                                    status=status_val,
                                    recognition_decision="match",
                                    similarity_score=rec_result["similarity"],
                                    quality_label=result.quality.get("label"),
                                    entry_zone_result="inside" if result.entry_zone.get("inside") else None,
                                    liveness_result=result.liveness.get("liveness"),
                                )
                                result.attendance_record = {
                                    "id": record.id,
                                    "student_id": record.student_id,
                                    "status": status_val,
                                    "student_name": student.full_name,
                                }
                                _async_broadcast(
                                    manager.broadcast_attendance_event(
                                        classroom_id=self._classroom.id if self._classroom else 0,
                                        student_name=student.full_name,
                                        status=status_val,
                                        similarity=rec_result["similarity"],
                                        decision="match",
                                    )
                                )
                except Exception as e:
                    logger.warning(f"Attendance recording failed: {e}")

            timestamps["end"] = time.perf_counter()
            result.latency = _compute_latencies(timestamps)
            results.append(result)
        return results


def _compute_latencies(timestamps: dict) -> dict:
    stages = {}
    prev_key = "start"
    for key in ["detection", "quality", "entry_zone", "liveness", "recognition", "end"]:
        if key in timestamps and prev_key in timestamps:
            stages[f"{prev_key}_to_{key}"] = round(
                (timestamps[key] - timestamps[prev_key]) * 1000, 2
            )
            prev_key = key
    if "start" in timestamps and "end" in timestamps:
        stages["total_ms"] = round((timestamps["end"] - timestamps["start"]) * 1000, 2)
    return stages


def _async_broadcast(coro):
    """Run an async coroutine from sync context."""
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(coro)
        else:
            loop.run_until_complete(coro)
    except Exception:
        pass