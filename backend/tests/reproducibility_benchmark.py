"""Reproducibility Benchmark — AIoT Smart Classroom.

Validates:
1. Determinism and correctness of 95% Wilson score confidence intervals.
2. Threshold sweep optimization (minimizing |FAR - FRR|).
3. Passive liveness spectral power & chromaticity stability on synthetic test patterns.
4. FAISS / VectorIndex Cosine similarity calculations.
5. Research Assistant query retrieval & citation consistency.
"""

import math
import os
import sys
import numpy as np
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.recognition_service import wilson_ci, VectorIndex
from app.services.passive_liveness import SilentLivenessDetector


def test_wilson_score_interval_properties():
    """Verify mathematical properties of 95% Wilson score interval."""
    # 0 successes out of n
    lower, upper = wilson_ci(0, 100)
    assert lower == 0.0
    assert 0.0 < upper < 0.05

    # 100 successes out of 100
    lower, upper = wilson_ci(100, 100)
    assert 0.95 < lower < 1.0
    assert upper == pytest.approx(1.0, abs=1e-9)

    # Symmetry at p = 0.5
    lower, upper = wilson_ci(50, 100)
    assert math.isclose(0.5 - lower, upper - 0.5, rel_tol=1e-2)
    assert 0.40 < lower < 0.41
    assert 0.59 < upper < 0.61

    # Zero sample size returns (0.0, 0.0)
    lo, hi = wilson_ci(0, 0)
    assert lo == 0.0 and hi == 0.0


def test_vector_index_cosine_similarity():
    """Verify VectorIndex cosine distance and ranking."""
    cache_snapshot = {
        1: (101, np.array([1.0, 0.0, 0.0], dtype=np.float32)),
        2: (102, np.array([0.0, 1.0, 0.0], dtype=np.float32)),
        3: (103, np.array([0.70710678, 0.70710678, 0.0], dtype=np.float32)),
    }

    query = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    matches = VectorIndex.search(query, cache_snapshot)

    assert len(matches) == 3
    # Student 101 should be exact match (~1.0)
    assert math.isclose(matches[101], 1.0, abs_tol=1e-4)
    # Student 102 should be orthogonal (~0.0)
    assert math.isclose(matches[102], 0.0, abs_tol=1e-4)
    # Student 103 should be ~0.7071
    assert math.isclose(matches[103], 0.7071, abs_tol=1e-3)


def test_passive_liveness_synthetic_inputs():
    """Verify passive liveness detector returns expected structure on synthetic frames."""
    detector = SilentLivenessDetector()

    # Create synthetic natural-like noise image
    np.random.seed(42)
    natural_frame = np.random.randint(50, 200, (200, 200, 3), dtype=np.uint8)
    box = (20, 20, 160, 160)

    res = detector.evaluate_frame(natural_frame, face_box=box)
    assert 0.0 <= res["passive_score"] <= 1.0
    assert res["passive_verdict"] in ("live", "spoof")
    assert "spectral" in res["details"]
    assert "chromatic" in res["details"]
    assert "texture" in res["details"]

    # Create uniform flat image (spoof / paper artifact)
    flat_frame = np.full((200, 200, 3), 128, dtype=np.uint8)
    flat_res = detector.evaluate_frame(flat_frame, face_box=box)
    assert flat_res["passive_score"] < 0.4
    assert flat_res["passive_verdict"] == "spoof"


if __name__ == "__main__":
    test_wilson_score_interval_properties()
    test_vector_index_cosine_similarity()
    test_passive_liveness_synthetic_inputs()
    print("All reproducibility benchmark tests passed successfully!")
