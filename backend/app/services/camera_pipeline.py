"""Camera pipeline — orchestrates the full recognition pipeline.

Frame → Detection → Quality Gate → Entry-Zone Gate → Embedding
  → Similarity → Threshold Decision → Liveness Check → Identity
  → Time-Window Classification → Duplicate Check → DB Write → WebSocket

Per-classroom configuration
----------------------------
If an active AttendanceConfiguration row exists for the classroom, its values
override the global settings (recognition threshold, blur threshold, face size,
entry-zone enabled, liveness enabled, session timing offsets).  This allows
different classrooms to operate at different sensitivity levels without
restarting the service.
"""

from __future__ import annotations

import asyncio
import datetime
import time
from typing import Optional, List

import cv2
import numpy as np
from sqlalchemy.orm import Session

from app.config import settings
from app.models.classroom import Classroom
from app.models.config import AttendanceConfiguration
from app.repositories.repository_sessions import (
    AttendanceRecordRepository,
    AttendanceSessionRepository,
    AttendanceConfigurationRepository,
)
from app.repositories.repository_core import StudentRepository
from app.services.face_detector import detect_faces
from app.services.quality_gate import QualityGate
from app.services.entry_zone import EntryZoneDetector
from app.services.recognition_service import RecognitionService
from app.services.liveness_service import LivenessDetector
from app.services.websocket_manager import manager
from app.utils.logging import logger


# ── Pipeline result ────────────────────────────────────────────────────────────

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


# ── Effective config helper ────────────────────────────────────────────────────

class _EffectiveConfig:
    """Merges per-classroom AttendanceConfiguration with global settings fallback."""

    def __init__(self, classroom_id: int, db: Session):
        cfg: Optional[AttendanceConfiguration] = None
        try:
            cfg = AttendanceConfigurationRepository(db).get_for_classroom(classroom_id)
        except Exception:
            pass

        self.recognition_threshold: float = (
            cfg.recognition_threshold if cfg and cfg.recognition_threshold is not None
            else settings.RECOGNITION_THRESHOLD
        )
        self.min_face_size: int = (
            cfg.min_face_size if cfg and cfg.min_face_size is not None
            else settings.MIN_FACE_SIZE
        )
        self.blur_threshold: float = (
            cfg.blur_threshold if cfg and cfg.blur_threshold is not None
            else settings.BLUR_THRESHOLD
        )
        self.late_start_offset: int = (
            cfg.late_start_offset if cfg and cfg.late_start_offset is not None
            else settings.SESSION_LATE_START_MINUTES
        )
        self.entry_zone_enabled: bool = (
            cfg.entry_zone_enabled if cfg is not None else True
        )
        self.liveness_enabled: bool = (
            cfg.liveness_enabled if cfg is not None else False
        )

    @classmethod
    def default(cls) -> "_EffectiveConfig":
        """Config from global settings only (no classroom override)."""
        obj = object.__new__(cls)
        obj.recognition_threshold = settings.RECOGNITION_THRESHOLD
        obj.min_face_size = settings.MIN_FACE_SIZE
        obj.blur_threshold = settings.BLUR_THRESHOLD
        obj.late_start_offset = settings.SESSION_LATE_START_MINUTES
        obj.entry_zone_enabled = True
        obj.liveness_enabled = False
        return obj


# ── Camera pipeline ────────────────────────────────────────────────────────────

class CameraPipeline:
    """Real-time face recognition pipeline.

    Per-classroom configuration is loaded when `configure(classroom)` is called.
    """

    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.quality_gate = QualityGate()
        self.entry_zone = EntryZoneDetector()
        self.liveness = LivenessDetector()
        self._recognition_service: Optional[RecognitionService] = None
        self._student_repo: Optional[StudentRepository] = None
        self._session_repo: Optional[AttendanceSessionRepository] = None
        self._record_repo: Optional[AttendanceRecordRepository] = None
        self._classroom: Optional[Classroom] = None
        self._cfg: _EffectiveConfig = _EffectiveConfig.default()

    def _init_db_services(self, db: Session) -> None:
        self.db = db
        self._recognition_service = RecognitionService(db)
        self._student_repo = StudentRepository(db)
        self._session_repo = AttendanceSessionRepository(db)
        self._record_repo = AttendanceRecordRepository(db)

    def configure(self, classroom: Classroom) -> None:
        """Bind this pipeline to a classroom and load its config overrides."""
        self._classroom = classroom
        self.entry_zone.configure(classroom)
        if self.db:
            self._cfg = _EffectiveConfig(classroom.id, self.db)
            # Apply per-classroom blur/size thresholds to QualityGate
            self.quality_gate.min_size = self._cfg.min_face_size
            self.quality_gate.blur_threshold = self._cfg.blur_threshold
        logger.debug(
            f"Pipeline configured for classroom={classroom.id} "
            f"threshold={self._cfg.recognition_threshold:.2f} "
            f"liveness={'on' if self._cfg.liveness_enabled else 'off'} "
            f"entry_zone={'on' if self._cfg.entry_zone_enabled else 'off'}"
        )

    def reset_liveness(self) -> None:
        self.liveness.reset()

    def process_frame(
        self,
        frame: np.ndarray,
        session_id: int,
        capture_timestamp: Optional[datetime.datetime] = None,
    ) -> List[PipelineResult]:
        """Process one video frame. Returns one PipelineResult per detected face."""
        results = []
        timestamps: dict = {"start": time.perf_counter()}

        # ── Face detection ────────────────────────────────────────────────────
        faces = detect_faces(frame)
        timestamps["detection"] = time.perf_counter()
        if not faces:
            return results

        h, w = frame.shape[:2]

        for face in faces:
            face_box = face["box"]
            landmarks = face.get("landmarks")
            result = PipelineResult()
            rec_result: dict = {}

            # ── Quality gate ──────────────────────────────────────────────────
            quality_result = self.quality_gate.check_face(
                frame, face_box, landmarks, is_enrollment=False
            )
            result.quality = {"label": quality_result.label, "reason": quality_result.reason}
            timestamps["quality"] = time.perf_counter()
            if not quality_result.passed():
                result.rejected = True
                result.reject_reason = f"Quality: {quality_result.reason}"
                timestamps["end"] = time.perf_counter()
                result.latency = _compute_latencies(timestamps)
                results.append(result)
                continue

            # ── Entry zone gate ───────────────────────────────────────────────
            if self._classroom and self._cfg.entry_zone_enabled:
                zone_result = self.entry_zone.check_face(face_box, w, h)
                result.entry_zone = zone_result
                timestamps["entry_zone"] = time.perf_counter()
                if not zone_result.get("inside", True):
                    result.rejected = True
                    result.reject_reason = f"Entry zone: {zone_result.get('reason', 'outside zone')}"
                    timestamps["end"] = time.perf_counter()
                    result.latency = _compute_latencies(timestamps)
                    results.append(result)
                    continue
            else:
                result.entry_zone = {"inside": True, "reason": "Entry zone disabled"}

            # ── Liveness check (experimental) ─────────────────────────────────
            if self._cfg.liveness_enabled and landmarks is not None:
                landmarks_np = np.array(landmarks)
                liveness_result = self.liveness.process_frame(landmarks_np)
                result.liveness = liveness_result
                timestamps["liveness"] = time.perf_counter()
                # Reject confirmed spoof; allow "uncertain" through (still observing)
                if liveness_result.get("liveness") == "spoof":
                    result.rejected = True
                    result.reject_reason = f"Liveness: {liveness_result.get('reason', 'spoof detected')}"
                    timestamps["end"] = time.perf_counter()
                    result.latency = _compute_latencies(timestamps)
                    results.append(result)
                    continue
            else:
                result.liveness = {
                    "liveness": "not_checked",
                    "reason": "Liveness disabled or no landmarks",
                }
                timestamps["liveness"] = time.perf_counter()

            # ── Recognition ───────────────────────────────────────────────────
            if self._recognition_service:
                rec_result = self._recognition_service.identify(
                    frame, threshold=self._cfg.recognition_threshold
                )
                result.recognition = rec_result
                result.identity = {
                    "student_id": rec_result.get("student_id"),
                    "similarity": rec_result.get("similarity"),
                    "decision": rec_result.get("decision"),
                }
            else:
                rec_result = {"student_id": None, "decision": "no_model"}
                result.recognition = rec_result
                result.identity = rec_result.copy()
            timestamps["recognition"] = time.perf_counter()

            # ── Attendance recording ──────────────────────────────────────────
            if (
                self.db
                and rec_result.get("decision") == "match"
                and rec_result.get("student_id")
            ):
                try:
                    session = self._session_repo.get(session_id)
                    if session and session.status == "active":
                        student = self._student_repo.get(rec_result["student_id"])
                        if student and student.is_active:
                            now = capture_timestamp or datetime.datetime.utcnow()
                            late_offset = (
                                session.late_start_offset
                                if session.late_start_offset
                                else self._cfg.late_start_offset
                            )
                            if now <= session.scheduled_start + datetime.timedelta(
                                minutes=late_offset
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
                                    similarity_score=rec_result.get("similarity"),
                                    quality_label=result.quality.get("label"),
                                    entry_zone_result=(
                                        "inside"
                                        if result.entry_zone.get("inside")
                                        else "outside"
                                    ),
                                    liveness_result=result.liveness.get("liveness"),
                                )
                                result.attendance_record = {
                                    "id": record.id,
                                    "student_id": record.student_id,
                                    "status": status_val,
                                    "student_name": student.full_name,
                                }
                                classroom_id = (
                                    self._classroom.id if self._classroom else 0
                                )
                                _async_broadcast(
                                    manager.broadcast_attendance_event(
                                        classroom_id=classroom_id,
                                        student_name=student.full_name,
                                        status=status_val,
                                        similarity=rec_result.get("similarity"),
                                        decision="match",
                                    )
                                )
                                # Trigger LED (simulated or physical)
                                try:
                                    from app.services.led_service import trigger_attendance_led
                                    trigger_attendance_led(
                                        status=status_val,
                                        student_name=student.full_name,
                                        classroom_id=classroom_id,
                                        db=self.db,
                                    )
                                except Exception:
                                    pass
                except Exception as e:
                    logger.warning(f"Attendance recording failed: {e}")

            timestamps["end"] = time.perf_counter()
            result.latency = _compute_latencies(timestamps)
            results.append(result)

        return results


# ── Helpers ────────────────────────────────────────────────────────────────────

def _compute_latencies(timestamps: dict) -> dict:
    stages: dict = {}
    prev_key = "start"
    for key in ["detection", "quality", "entry_zone", "liveness", "recognition", "end"]:
        if key in timestamps and prev_key in timestamps:
            stages[f"{prev_key}_to_{key}_ms"] = round(
                (timestamps[key] - timestamps[prev_key]) * 1000, 2
            )
            prev_key = key
    if "start" in timestamps and "end" in timestamps:
        stages["total_ms"] = round(
            (timestamps["end"] - timestamps["start"]) * 1000, 2
        )
    return stages


def _async_broadcast(coro) -> None:
    """Fire-and-forget an async coroutine from a sync context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(coro)
        else:
            loop.run_until_complete(coro)
    except Exception:
        pass
