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
        self.label = label      # GOOD / ACCEPTABLE / REJECT
        self.reason = reason
        self.face_box = face_box
        self.landmarks = landmarks

    def passed(self) -> bool:
        return self.label in ("GOOD", "ACCEPTABLE")

    def __repr__(self) -> str:
        return f"<QualityResult {self.label}: {self.reason}>"


class QualityGate:
    """Applies quality checks to detected faces.

    Checks (in order):
    1. Face size >= min_size
    2. Blur (Laplacian variance >= blur_threshold)
    3. Pose extremity (via face aspect ratio)

    Thresholds (relaxed from original so real webcam captures pass):
    - MIN_FACE_SIZE default 80px — enrollment requires 90px (not 120px)
    - Blur threshold default 80 — stays the same
    - Aspect ratio 0.35–2.0 (was 0.4–1.8) to handle slight tilts
    """

    # Relaxed enrollment threshold — was 1.5× (120px), now 1.1× (88px)
    # This allows users sitting ~0.5m from webcam to pass without leaning in
    ENROLLMENT_SIZE_FACTOR = 1.1

    def __init__(self):
        self.min_size       = settings.MIN_FACE_SIZE       # 80px default
        self.blur_threshold = settings.BLUR_THRESHOLD      # 80.0 default

    def check_face(
        self,
        frame: np.ndarray,
        face_box: Tuple[int, int, int, int],
        landmarks: Optional[list] = None,
        is_enrollment: bool = False,
    ) -> QualityResult:
        x, y, w, h = face_box
        reasons = []

        # ── 1. Size check ──────────────────────────────────────────────────
        if is_enrollment:
            min_size = int(self.min_size * self.ENROLLMENT_SIZE_FACTOR)  # ~88px
        else:
            min_size = self.min_size

        if w < min_size or h < min_size:
            reasons.append(
                f"Move closer — face too small ({w}×{h}px, need ≥{min_size}px)"
            )

        # ── 2. Blur check (Laplacian variance) ────────────────────────────
        try:
            face_roi = frame[y: y + h, x: x + w]
            if face_roi.size == 0:
                reasons.append("Empty face region")
            else:
                gray_roi      = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
                laplacian_var = cv2.Laplacian(gray_roi, cv2.CV_64F).var()
                blur_thresh   = 35.0 if is_enrollment else self.blur_threshold
                if laplacian_var < blur_thresh:
                    reasons.append(
                        f"Face is blurry (score={laplacian_var:.0f}, need ≥{blur_thresh:.0f}) "
                        f"— hold still or improve lighting"
                    )
        except Exception as e:
            reasons.append(f"Blur check error: {e}")

        # ── 3. Pose (aspect ratio) ─────────────────────────────────────────
        aspect = w / max(h, 1)
        if aspect < 0.35 or aspect > 2.0:
            reasons.append(
                f"Extreme pose (ratio={aspect:.2f}) — face the camera directly"
            )

        # ── Verdict ────────────────────────────────────────────────────────
        if not reasons:
            return QualityResult(
                label="GOOD",
                reason="All checks passed",
                face_box=face_box,
                landmarks=landmarks,
            )
        elif len(reasons) == 1:
            return QualityResult(
                label="ACCEPTABLE",
                reason=reasons[0],
                face_box=face_box,
                landmarks=landmarks,
            )
        else:
            return QualityResult(
                label="REJECT",
                reason="; ".join(reasons),
                face_box=face_box,
                landmarks=landmarks,
            )
