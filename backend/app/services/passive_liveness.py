"""Passive face anti-spoofing / silent liveness detection.

Detects presentation attacks (printed photos, digital screen replays, 2D masks)
from a single video frame without requiring facial landmarks or temporal blinks.

Methodology:
1. Multi-scale Face Region Analysis:
   - High-Frequency Fourier Power Spectrum: Print paper and LCD/OLED screens show
     distinct frequency cutoffs and high-frequency Moiré interference patterns.
   - Chromaticity Distribution: Natural human skin in YCbCr/HSV color spaces exhibits
     specific chromatic dispersion that differs markedly from photographic paper dye
     and RGB subpixel emissions.
   - Specular Reflection & Gradient Texture: Real 3D facial morphology produces
     continuous gradient transitions, whereas planar surfaces (prints/screens) have
     uniform reflection characteristics or specular hotspots.
2. Optional Deep Silent Anti-Spoofing:
   - If an ONNX MiniFASNet model is available on disk, runs deep inference for
     enhanced feature discrimination.
"""

from __future__ import annotations

import os
import threading
from typing import Dict, Optional, Tuple

import cv2
import numpy as np

from app.config import settings
from app.utils.logging import logger

_onnx_session = None
_onnx_lock = threading.Lock()
_onnx_checked = False


def _try_load_onnx_model():
    """Attempt to load ONNX MiniFASNet silent anti-spoofing model if present."""
    global _onnx_session, _onnx_checked
    with _onnx_lock:
        if _onnx_checked:
            return _onnx_session
        _onnx_checked = True
        model_paths = [
            os.path.join(os.path.dirname(__file__), "..", "models", "minifasnet.onnx"),
            os.path.join(os.path.dirname(__file__), "minifasnet.onnx"),
        ]
        for p in model_paths:
            if os.path.isfile(p):
                try:
                    import onnxruntime as ort
                    _onnx_session = ort.InferenceSession(
                        p, providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
                    )
                    logger.info(f"Loaded ONNX MiniFASNet silent liveness model from {p}")
                    return _onnx_session
                except Exception as e:
                    logger.warning(f"Failed loading ONNX model from {p}: {e}")
        return None


def _fourier_spectral_score(face_gray: np.ndarray) -> float:
    """Compute normalized high-frequency power ratio from 2D FFT.

    Real 3D skin texture retains natural multi-scale high-frequency energy.
    Printed paper displays a steep cutoff, while digital screens display
    artificial peaks due to the pixel grid (Moiré).
    """
    h, w = face_gray.shape
    if h < 32 or w < 32:
        return 0.5

    f = np.fft.fft2(face_gray)
    fshift = np.fft.fftshift(f)
    magnitude = np.abs(fshift)

    # Compute energy in outer high-frequency band vs central low-frequency band
    cy, cx = h // 2, w // 2
    r_inner = min(h, w) // 6
    r_outer = min(h, w) // 2

    y, x = np.ogrid[:h, :w]
    dist = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)

    inner_energy = np.sum(magnitude[dist <= r_inner])
    mid_outer_energy = np.sum(magnitude[(dist > r_inner) & (dist <= r_outer)])

    if inner_energy <= 1e-6:
        return 0.5

    ratio = mid_outer_energy / inner_energy
    # Natural skin typically yields ratio between 0.08 and 0.40 depending on resolution
    # Normalize ratio into [0, 1] probability
    norm_score = float(np.clip((ratio - 0.03) / 0.35, 0.0, 1.0))
    return norm_score


def _chromaticity_score(face_bgr: np.ndarray) -> float:
    """Analyze chromaticity dispersion in YCbCr and HSV spaces.

    Skin reflectance follows melanin/hemoglobin biological absorption curves.
    Printed CMYK ink or RGB screen backlight causes chromatic distortion.
    """
    if face_bgr.size == 0:
        return 0.5

    ycbcr = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2YCrCb)
    cb = ycbcr[:, :, 1].astype(np.float32)
    cr = ycbcr[:, :, 2].astype(np.float32)

    # Standard skin locus: Cr ~ 133-173, Cb ~ 77-127
    cr_mean, cr_std = float(np.mean(cr)), float(np.std(cr))
    cb_mean, cb_std = float(np.mean(cb)), float(np.std(cb))

    # Variance and standard deviation check
    in_cr_range = 130.0 <= cr_mean <= 180.0
    in_cb_range = 75.0 <= cb_mean <= 135.0

    dispersion = cr_std * cb_std
    # Paper prints tend to have low chromatic dispersion; screens have extreme saturated dispersion
    valid_dispersion = 15.0 <= dispersion <= 450.0

    score = 0.2
    if in_cr_range and in_cb_range:
        score += 0.5
    if valid_dispersion:
        score += 0.3

    return float(np.clip(score, 0.0, 1.0))


def _texture_gradient_score(face_gray: np.ndarray) -> float:
    """Evaluate Laplacian gradient variance and surface smoothness."""
    laplacian = cv2.Laplacian(face_gray, cv2.CV_64F)
    var = float(laplacian.var())

    # Very low variance = flat/reprinted paper; extreme variance = high-contrast screen grid
    if var < 30.0:
        return float(np.clip(var / 60.0, 0.0, 0.5))
    elif var > 2000.0:
        return 0.4
    else:
        # Optimal skin gradient texture range
        return float(np.clip(0.6 + (var - 30.0) / 1000.0 * 0.4, 0.0, 1.0))


class SilentLivenessDetector:
    """Passive anti-spoofing evaluator using multi-cue spectral, chromatic, and texture analysis."""

    def __init__(self, threshold: float = 0.50):
        self.threshold = threshold

    def evaluate_frame(self, frame_bgr: np.ndarray, face_box: Optional[Tuple[int, int, int, int]] = None) -> Dict:
        """Evaluate a single frame for print/replay/mask attack.

        Args:
            frame_bgr: Full BGR frame (or pre-cropped face).
            face_box: Optional (x, y, w, h) bounding box.

        Returns:
            {
                "passive_score": float (0.0 to 1.0, higher = more likely live),
                "passive_verdict": "live" | "spoof",
                "confidence": float,
                "details": {
                    "spectral": float,
                    "chromatic": float,
                    "texture": float,
                    "deep_onnx": float | None
                }
            }
        """
        if frame_bgr is None or frame_bgr.size == 0:
            return {
                "passive_score": 0.0,
                "passive_verdict": "spoof",
                "confidence": 0.0,
                "details": {"error": "Empty frame"},
            }

        h, w = frame_bgr.shape[:2]
        if face_box:
            x, y, fw, fh = face_box
            # Add 15% margin around face
            pad_x, pad_y = int(fw * 0.15), int(fh * 0.15)
            x1, y1 = max(0, x - pad_x), max(0, y - pad_y)
            x2, y2 = min(w, x + fw + pad_x), min(h, y + fh + pad_y)
            face_crop = frame_bgr[y1:y2, x1:x2]
        else:
            face_crop = frame_bgr

        if face_crop.size == 0 or face_crop.shape[0] < 20 or face_crop.shape[1] < 20:
            return {
                "passive_score": 0.0,
                "passive_verdict": "spoof",
                "confidence": 0.0,
                "details": {"error": "Face crop too small"},
            }

        face_gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)

        # 1. Fourier Spectral Analysis
        spectral_score = _fourier_spectral_score(face_gray)

        # 2. Chromaticity Distribution
        chromatic_score = _chromaticity_score(face_crop)

        # 3. Texture Gradient
        texture_score = _texture_gradient_score(face_gray)

        # 4. Optional Deep Model (ONNX)
        onnx_score = None
        session = _try_load_onnx_model()
        if session:
            try:
                # Standard MiniFASNet input: 80x80 or 128x128
                inp = cv2.resize(face_crop, (80, 80)).astype(np.float32) / 255.0
                inp = np.transpose(inp, (2, 0, 1))
                inp = np.expand_dims(inp, axis=0)
                input_name = session.get_inputs()[0].name
                raw_out = session.run(None, {input_name: inp})[0]
                # Softmax or probability score
                prob = float(np.exp(raw_out[0][1]) / np.sum(np.exp(raw_out[0])))
                onnx_score = prob
            except Exception as e:
                logger.debug(f"Deep anti-spoofing inference error: {e}")

        # Fuse passive cues
        if onnx_score is not None:
            fused_passive = 0.50 * onnx_score + 0.20 * spectral_score + 0.15 * chromatic_score + 0.15 * texture_score
        else:
            fused_passive = 0.40 * spectral_score + 0.35 * chromatic_score + 0.25 * texture_score

        fused_passive = round(float(np.clip(fused_passive, 0.0, 1.0)), 4)
        verdict = "live" if fused_passive >= self.threshold else "spoof"
        confidence = round(abs(fused_passive - 0.5) * 2.0, 4)

        return {
            "passive_score": fused_passive,
            "passive_verdict": verdict,
            "confidence": confidence,
            "details": {
                "spectral": round(spectral_score, 4),
                "chromatic": round(chromatic_score, 4),
                "texture": round(texture_score, 4),
                "deep_onnx": round(onnx_score, 4) if onnx_score is not None else None,
            },
        }


# Global detector singleton
silent_liveness_detector = SilentLivenessDetector(threshold=settings.PASSIVE_LIVENESS_THRESHOLD)
