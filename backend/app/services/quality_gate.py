"""Quality gating for face enrollment — size, blur, pose, single-face checks."""

from __future__ import annotations

import cv2
import numpy as np
from typing import Optional, Tuple

from app.config import settings


class QualityResult:
    """Result of quality gating on a single face."""

    def __init__(
        self,
        label: str,
        reason: str = "",
        face_box: Optional[Tuple[int, int, int, int]] = None,
        landmarks: Optional[list] = None,
    ):
        self.label = label  # GOOD / ACCEPTABLE / REJECT
        self.reason = reason
        self.face_box = face_box
        self.landmarks = landmarks

    def passed(self) -> bool:
        return self.label in ("GOOD", "ACCEPTABLE")

    def __repr__(self) -> str:
        return f"<QualityResult {self.label}: {self.reason}>"


class QualityGate:
    """Applies quality checks to detected faces.

    Checks:
    1. Face size >= MIN_FACE_SIZE
    2. Blur (Laplacian variance >= BLUR_THRESHOLD)
    3. Pose extremity (via face aspect ratio)
    4. Enrollment-only: larger face, near-frontal pose
    """

    def __init__(self):
        self.min_size = settings.MIN_FACE_SIZE
        self.blur_threshold = settings.BLUR_THRESHOLD

    def check_face(
        self,
        frame: np.ndarray,
        face_box: Tuple[int, int, int, int],
        landmarks: Optional[list] = None,
        is_enrollment: bool = False,
    ) -> QualityResult:
        x, y, w, h = face_box
        reasons = []

        # 1. Size check
        if w < self.min_size or h < self.min_size:
            reasons.append(f"Face too small ({w}x{h}px, min {self.min_size})")

        # 2. Blur check (Laplacian variance)
        try:
            face_roi = frame[y : y + h, x : x + w]
            if face_roi.size == 0:
                reasons.append("Empty face region")
            else:
                gray_roi = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
                laplacian_var = cv2.Laplacian(gray_roi, cv2.CV_64F).var()
                if laplacian_var < self.blur_threshold:
                    reasons.append(
                        f"Blurry face (var={laplacian_var:.1f}, "
                        f"min={self.blur_threshold})"
                    )
        except Exception as e:
            reasons.append(f"Blur check error: {e}")

        # 3. Pose via bounding-box aspect ratio
        aspect_ratio = w / max(h, 1)
        if aspect_ratio < 0.4 or aspect_ratio > 1.8:
            reasons.append(f"Extreme pose (aspect={aspect_ratio:.2f})")

        # 4. Enrollment-only stricter checks
        if is_enrollment:
            if w < self.min_size * 1.5:
                reasons.append(
                    f"Enrollment requires larger face "
                    f"({w}px, min {self.min_size * 1.5})"
                )
            if aspect_ratio < 0.6 or aspect_ratio > 1.5:
                reasons.append("Enrollment requires near-frontal pose")

        if not reasons:
            return QualityResult(
                label="GOOD", reason="All checks passed",
                face_box=face_box, landmarks=landmarks,
            )
        elif len(reasons) <= 1:
            return QualityResult(
                label="ACCEPTABLE", reason="; ".join(reasons),
                face_box=face_box, landmarks=landmarks,
            )
        else:
            return QualityResult(
                label="REJECT", reason="; ".join(reasons),
                face_box=face_box, landmarks=landmarks,
            )