"""Liveness detection (experimental) — EAR blink detection via MediaPipe Face Mesh.

LANDMARK SOURCE FIX
-------------------
The original implementation indexed landmarks 36–47 (68-point dlib model).
InsightFace buffalo_l provides only 5 key points, so `len(landmarks) < 48`
was always True and every call returned "uncertain".

This version uses **MediaPipe Face Mesh** (468 landmarks) as the primary
source.  MediaPipe is a pure-Python package (`pip install mediapipe`) with no
C++ compiler requirement, making it the lowest-friction 468-point source
available.

Eye landmark indices below are the MediaPipe Face Mesh equivalents of the
classic dlib 68-point eye contours:
  Left eye  (MediaPipe): [33, 160, 158, 133, 153, 144]
  Right eye (MediaPipe): [362, 385, 387, 263, 373, 380]

These six points per eye are sufficient for EAR computation.

EXPERIMENTAL DISCLAIMER
-----------------------
This is a lightweight blink-based liveness check — not production-grade
anti-spoofing.  A high-quality printed photo held perfectly still for
>60 frames will be classified as "spoof".  A good video replay may fool it.
Always report as EXPERIMENTAL in the thesis.
"""

from __future__ import annotations

import threading
from typing import Optional, Tuple

import cv2
import numpy as np

from app.utils.logging import logger

# ── MediaPipe lazy load ────────────────────────────────────────────────────────
_mp_face_mesh = None
_mp_lock = threading.Lock()
_mp_available = None          # None = not yet tried; True/False after first attempt


def _load_mediapipe() -> bool:
    """Lazy-load MediaPipe Face Mesh.  Thread-safe.  Returns True if available."""
    global _mp_face_mesh, _mp_available
    with _mp_lock:
        if _mp_available is not None:
            return _mp_available
        try:
            import mediapipe as mp
            _mp_face_mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            _mp_available = True
            logger.info("LivenessDetector: MediaPipe Face Mesh loaded (468 landmarks)")
        except ImportError:
            _mp_available = False
            logger.warning(
                "LivenessDetector: mediapipe not installed — liveness will return 'uncertain'. "
                "Install with: pip install mediapipe>=0.10.0"
            )
        except Exception as e:
            _mp_available = False
            logger.warning(f"LivenessDetector: MediaPipe load failed: {e}")
    return bool(_mp_available)


def extract_landmarks_mediapipe(frame_bgr: np.ndarray) -> Optional[np.ndarray]:
    """Run MediaPipe Face Mesh on a BGR frame.

    Returns a (468, 2) array of (x_px, y_px) landmark coordinates,
    or None if no face detected or MediaPipe unavailable.
    """
    if not _load_mediapipe():
        return None
    try:
        h, w = frame_bgr.shape[:2]
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        results = _mp_face_mesh.process(rgb)
        if not results.multi_face_landmarks:
            return None
        lm = results.multi_face_landmarks[0].landmark
        coords = np.array([[l.x * w, l.y * h] for l in lm], dtype=np.float32)
        return coords                      # shape (468, 2)
    except Exception as e:
        logger.debug(f"MediaPipe landmark extraction failed: {e}")
        return None


# ── EAR index sets (MediaPipe Face Mesh) ──────────────────────────────────────
# These are the 6-point eye contour equivalents in the 468-point mesh.
_LEFT_EYE_IDX  = [33,  160, 158, 133, 153, 144]
_RIGHT_EYE_IDX = [362, 385, 387, 263, 373, 380]


def _eye_aspect_ratio(eye_pts: np.ndarray) -> float:
    """Compute EAR from 6 landmark points.

    EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
    """
    v1 = float(np.linalg.norm(eye_pts[1] - eye_pts[5]))
    v2 = float(np.linalg.norm(eye_pts[2] - eye_pts[4]))
    h  = float(np.linalg.norm(eye_pts[0] - eye_pts[3]))
    return (v1 + v2) / (2.0 * h) if h > 1e-6 else 1.0


# ── Detector class ─────────────────────────────────────────────────────────────

class LivenessDetector:
    """Blink-based liveness detection using MediaPipe Face Mesh (468 landmarks).

    Requires 2 natural blinks within `detection_window` frames to classify
    as "live".  Zero blinks after the full window → "spoof".
    Still collecting → "uncertain".

    This is EXPERIMENTAL — not production-grade anti-spoofing.
    """

    def __init__(
        self,
        ear_threshold: float = 0.21,
        consecutive_frames: int = 3,
        detection_window: int = 60,
    ):
        self.ear_threshold = ear_threshold
        self.consecutive_frames = consecutive_frames
        self.detection_window = detection_window
        self._ear_history: list = []
        self._blink_count: int = 0
        self._low_ear_frames: int = 0

    def reset(self) -> None:
        """Reset detector state (call between sessions or subjects)."""
        self._ear_history = []
        self._blink_count = 0
        self._low_ear_frames = 0

    # ── Primary entry: frame-level processing with auto landmark extraction ──

    def process_frame_bgr(self, frame_bgr: np.ndarray) -> dict:
        """Full pipeline: extract MediaPipe landmarks from BGR frame, then run EAR.

        This is the preferred entry point for the camera pipeline — pass the
        raw BGR numpy frame and let MediaPipe handle landmark extraction.

        Returns same dict format as process_frame().
        """
        landmarks = extract_landmarks_mediapipe(frame_bgr)
        return self.process_frame(landmarks)

    # ── Secondary entry: pre-extracted 468-point landmarks ──────────────────

    def process_frame(self, landmarks: Optional[np.ndarray]) -> dict:
        """Compute EAR and update blink state from pre-extracted landmarks.

        Args:
            landmarks: (N, 2) array of (x, y) pixel coordinates.
                       Must have at least 388 rows (max MediaPipe index used is 387).
                       Pass None to get "uncertain" with a clear reason.

        Returns:
            {
                "liveness":    "live" | "spoof" | "uncertain",
                "blink_count": int,
                "ear":         float | None,
                "reason":      str,
                "landmark_source": "mediapipe_468" | "none",
            }
        """
        if landmarks is None or len(landmarks) < 388:
            if not _load_mediapipe():
                reason = (
                    "MediaPipe not installed — install with: pip install mediapipe>=0.10.0. "
                    "Liveness check disabled."
                )
            else:
                reason = (
                    f"Insufficient landmarks ({len(landmarks) if landmarks is not None else 0} "
                    f"< 388 required). Pass a 468-point MediaPipe array."
                )
            return {
                "liveness": "uncertain",
                "blink_count": self._blink_count,
                "ear": None,
                "reason": reason,
                "landmark_source": "none",
            }

        left_eye  = landmarks[_LEFT_EYE_IDX]
        right_eye = landmarks[_RIGHT_EYE_IDX]
        ear = (_eye_aspect_ratio(left_eye) + _eye_aspect_ratio(right_eye)) / 2.0

        self._ear_history.append(ear)
        if len(self._ear_history) > self.detection_window:
            self._ear_history.pop(0)

        # Blink detection
        if ear < self.ear_threshold:
            self._low_ear_frames += 1
        else:
            if self._low_ear_frames >= self.consecutive_frames:
                self._blink_count += 1
            self._low_ear_frames = 0

        # Verdict
        if self._blink_count >= 2:
            verdict = "live"
            reason  = f"Detected {self._blink_count} natural blinks"
        elif len(self._ear_history) >= self.detection_window and self._blink_count == 0:
            verdict = "spoof"
            reason  = "No blinks detected in observation window"
        else:
            verdict = "uncertain"
            reason  = f"Observing… ({len(self._ear_history)}/{self.detection_window} frames, {self._blink_count} blinks)"

        return {
            "liveness":        verdict,
            "blink_count":     self._blink_count,
            "ear":             round(ear, 4),
            "reason":          reason,
            "landmark_source": "mediapipe_468",
        }
