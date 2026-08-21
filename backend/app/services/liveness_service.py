"""Liveness detection (experimental) — blink detection over consecutive frames.

This is a lightweight presentation-attack detection technique.
It detects natural blink patterns that printed photos and screen replays lack.
"""

from __future__ import annotations

import cv2
import numpy as np
from typing import Optional, Tuple

from app.utils.logging import logger


class LivenessDetector:
    """Blink-based liveness detection using facial landmarks.

    Uses the Eye Aspect Ratio (EAR) to detect blinks:
        EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
    A sustained low EAR for several frames indicates a blink.

    This is an EXPERIMENTAL technique — not production-grade anti-spoofing.
    """

    # Eye landmark indices for a 68-point facial landmark model
    # (left eye: 36-41, right eye: 42-47)
    LEFT_EYE_IDX = list(range(36, 42))
    RIGHT_EYE_IDX = list(range(42, 48))

    def __init__(
        self,
        ear_threshold: float = 0.21,
        consecutive_frames: int = 3,
        detection_window: int = 60,
    ):
        self.ear_threshold = ear_threshold
        self.consecutive_frames = consecutive_frames
        self.detection_window = detection_window  # frames to consider for liveness
        self._ear_history = []  # rolling window of EAR values
        self._blink_count = 0
        self._low_ear_frames = 0

    def _eye_aspect_ratio(self, eye_pts: np.ndarray) -> float:
        """Compute the Eye Aspect Ratio from 6 landmark points."""
        # Vertical distances
        v1 = np.linalg.norm(eye_pts[1] - eye_pts[5])
        v2 = np.linalg.norm(eye_pts[2] - eye_pts[4])
        # Horizontal distance
        h = np.linalg.norm(eye_pts[0] - eye_pts[3])
        if h < 1e-6:
            return 1.0
        return (v1 + v2) / (2.0 * h)

    def reset(self) -> None:
        """Reset the detection state for a new session."""
        self._ear_history = []
        self._blink_count = 0
        self._low_ear_frames = 0

    def process_frame(self, landmarks: Optional[np.ndarray]) -> dict:
        """Process a single frame with facial landmarks.

        Args:
            landmarks: 68x2 array of facial landmark coordinates, or None

        Returns:
            {
                "liveness": "live" | "spoof" | "uncertain",
                "blink_count": int,
                "ear": float or None,
                "reason": str,
            }
        """
        if landmarks is None or len(landmarks) < 48:
            return {
                "liveness": "uncertain",
                "blink_count": self._blink_count,
                "ear": None,
                "reason": "No landmarks available",
            }

        # Compute EAR for both eyes
        left_eye = landmarks[self.LEFT_EYE_IDX]
        right_eye = landmarks[self.RIGHT_EYE_IDX]
        left_ear = self._eye_aspect_ratio(left_eye)
        right_ear = self._eye_aspect_ratio(right_eye)
        ear = (left_ear + right_ear) / 2.0

        self._ear_history.append(ear)
        if len(self._ear_history) > self.detection_window:
            self._ear_history.pop(0)

        # Check for blink (sustained low EAR)
        if ear < self.ear_threshold:
            self._low_ear_frames += 1
        else:
            if self._low_ear_frames >= self.consecutive_frames:
                self._blink_count += 1
            self._low_ear_frames = 0

        # Determine liveness
        if self._blink_count >= 2:
            return {
                "liveness": "live",
                "blink_count": self._blink_count,
                "ear": round(ear, 4),
                "reason": f"Detected {self._blink_count} natural blinks",
            }
        elif len(self._ear_history) >= self.detection_window and self._blink_count == 0:
            return {
                "liveness": "spoof",
                "blink_count": 0,
                "ear": round(ear, 4),
                "reason": "No blinks detected in observation window",
            }
        else:
            return {
                "liveness": "uncertain",
                "blink_count": self._blink_count,
                "ear": round(ear, 4),
                "reason": f"Observing... ({len(self._ear_history)}/{self.detection_window} frames)",
            }