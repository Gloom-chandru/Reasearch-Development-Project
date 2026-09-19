"""Liveness detection — fused passive anti-spoofing + MediaPipe 468-point EAR blink detection.

LANDMARK SOURCE & LIVENESS ARCHITECTURE:
----------------------------------------
The system combines:
1. Passive Silent Anti-Spoofing (SilentLivenessDetector):
   - Landmark-independent single-frame evaluation of high-frequency Fourier
     spectra, YCbCr/HSV chromaticity dispersion, and surface gradient reflections.
   - Detects static 2D paper prints, digital screen replays (Moiré), and masks.
2. Temporal Blink Detection (MediaPipe Face Mesh):
   - Upgraded to MediaPipe 468-point dense face mesh (replaces the unreliable
     5-point InsightFace landmarks).
   - Extracts 6-point contours for left eye [33, 160, 158, 133, 153, 144] and
     right eye [362, 385, 387, 263, 373, 380].
3. Score Fusion:
   - Fuses instantaneous passive confidence with temporal physiological blink signal.
   - Immediately stops presentation attacks if passive score indicates clear spoof,
     while confirming live subjects when natural physiological dynamics are present.
"""

from __future__ import annotations

import threading
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

from app.config import settings
from app.services.passive_liveness import silent_liveness_detector
from app.utils.logging import logger

# ── MediaPipe lazy load ────────────────────────────────────────────────────────
_mp_face_mesh = None
_mp_lock = threading.Lock()
_mp_available = None  # None = not yet tried; True/False after first attempt


def _load_mediapipe() -> bool:
    """Lazy-load MediaPipe Face Mesh. Thread-safe. Returns True if available."""
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
                "LivenessDetector: mediapipe not installed — install with: pip install mediapipe>=0.10.0"
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
        return coords  # shape (468, 2)
    except Exception as e:
        logger.debug(f"MediaPipe landmark extraction failed: {e}")
        return None


# ── EAR index sets (MediaPipe Face Mesh 468 landmarks) ─────────────────────────
_LEFT_EYE_IDX = [33, 160, 158, 133, 153, 144]
_RIGHT_EYE_IDX = [362, 385, 387, 263, 373, 380]


def _eye_aspect_ratio(eye_pts: np.ndarray) -> float:
    """Compute EAR from 6 landmark points.

    EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
    """
    v1 = float(np.linalg.norm(eye_pts[1] - eye_pts[5]))
    v2 = float(np.linalg.norm(eye_pts[2] - eye_pts[4]))
    h = float(np.linalg.norm(eye_pts[0] - eye_pts[3]))
    return (v1 + v2) / (2.0 * h) if h > 1e-6 else 1.0


class LivenessDetector:
    """Fused liveness detector: passive anti-spoofing + MediaPipe 468-point EAR blink detection."""

    def __init__(
        self,
        ear_threshold: float = 0.21,
        consecutive_frames: int = 3,
        detection_window: int = 60,
    ):
        self.ear_threshold = ear_threshold
        self.consecutive_frames = consecutive_frames
        self.detection_window = detection_window
        self._ear_history: List[float] = []
        self._blink_count: int = 0
        self._low_ear_frames: int = 0

    def reset(self) -> None:
        """Reset detector state (call between sessions or subjects)."""
        self._ear_history = []
        self._blink_count = 0
        self._low_ear_frames = 0

    def process_frame_bgr(
        self,
        frame_bgr: np.ndarray,
        face_box: Optional[Tuple[int, int, int, int]] = None,
    ) -> dict:
        """Full pipeline: run passive anti-spoofing, extract MediaPipe landmarks, and fuse.

        Returns required schema:
            {
                "liveness": "live" | "spoof" | "uncertain",
                "passive_score": float,
                "passive_verdict": "live" | "spoof",
                "blink_count": int,
                "ear": float | None,
                "blink_verdict": "live" | "spoof" | "uncertain",
                "fused_score": float,
                "reason": str,
            }
        """
        # 1. Passive single-frame anti-spoofing
        passive_res = silent_liveness_detector.evaluate_frame(frame_bgr, face_box=face_box)
        passive_score = passive_res["passive_score"]
        passive_verdict = passive_res["passive_verdict"]

        # 2. MediaPipe 468-point landmark extraction
        landmarks = extract_landmarks_mediapipe(frame_bgr)
        blink_res = self.process_landmarks(landmarks)

        ear = blink_res["ear"]
        blink_count = blink_res["blink_count"]
        blink_verdict = blink_res["blink_verdict"]

        # 3. Fuse scores
        # Strong spoof detection on passive signal (e.g. printed paper / digital screen)
        if passive_score < 0.30:
            final_liveness = "spoof"
            fused_score = round(passive_score * 0.6, 4)
            reason = f"Passive anti-spoofing detected presentation attack (score={passive_score:.2f})"
        elif passive_score >= 0.70 and blink_count >= 1:
            final_liveness = "live"
            fused_score = round(0.55 * passive_score + 0.45 * min(1.0, blink_count / 2.0), 4)
            reason = f"Passive skin reflectance verified ({passive_score:.2f}) & {blink_count} natural blink(s) observed"
        elif blink_count >= 2:
            final_liveness = "live"
            fused_score = round(0.50 * passive_score + 0.50, 4)
            reason = f"Detected {blink_count} natural blinks (passive={passive_score:.2f})"
        elif len(self._ear_history) >= self.detection_window and blink_count == 0:
            final_liveness = "spoof"
            fused_score = round(passive_score * 0.4, 4)
            reason = "No blinks detected in observation window"
        else:
            final_liveness = "uncertain"
            fused_score = round(passive_score * 0.7, 4)
            reason = (
                f"Observing… ({len(self._ear_history)}/{self.detection_window} frames, "
                f"{blink_count} blinks, passive={passive_score:.2f})"
            )

        return {
            "liveness": final_liveness,
            "passive_score": passive_score,
            "passive_verdict": passive_verdict,
            "blink_count": blink_count,
            "ear": ear,
            "blink_verdict": blink_verdict,
            "fused_score": fused_score,
            "reason": reason,
        }

    def process_landmarks(self, landmarks: Optional[np.ndarray]) -> dict:
        """Compute EAR and update blink state from pre-extracted landmarks."""
        if landmarks is None or len(landmarks) < 388:
            return {
                "blink_verdict": "uncertain",
                "blink_count": self._blink_count,
                "ear": None,
                "reason": "MediaPipe landmarks unavailable or insufficient",
            }

        left_eye = landmarks[_LEFT_EYE_IDX]
        right_eye = landmarks[_RIGHT_EYE_IDX]
        ear = (_eye_aspect_ratio(left_eye) + _eye_aspect_ratio(right_eye)) / 2.0

        self._ear_history.append(ear)
        if len(self._ear_history) > self.detection_window:
            self._ear_history.pop(0)

        # Blink state tracking
        if ear < self.ear_threshold:
            self._low_ear_frames += 1
        else:
            if self._low_ear_frames >= self.consecutive_frames:
                self._blink_count += 1
            self._low_ear_frames = 0

        if self._blink_count >= 2:
            blink_verdict = "live"
        elif len(self._ear_history) >= self.detection_window and self._blink_count == 0:
            blink_verdict = "spoof"
        else:
            blink_verdict = "uncertain"

        return {
            "blink_verdict": blink_verdict,
            "blink_count": self._blink_count,
            "ear": round(ear, 4),
        }
