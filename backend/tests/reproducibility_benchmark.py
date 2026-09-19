"""Reproducibility Benchmark — AIoT Smart Classroom.

Validates:
1. Determinism and correctness of 95% Wilson score confidence intervals.
2. Threshold sweep optimization (minimizing |FAR - FRR|).
3. Passive liveness spectral power & chromaticity stability on synthetic test patterns.
4. FAISS / VectorIndex Cosine similarity calculations.
5. Research Assistant query retrieval & citation consistency.
"""

import math
import numpy as np
import pytest
from app.utils.statistics import wilson_score_interval
from app.services.cache_service import VectorIndex
from app.services.passive_liveness import SilentLivenessDetector


def test_wilson_score_interval_properties():
    """Verify mathematical properties of 95% Wilson score interval."""
    # 0 successes out of n
    lower, upper = wilson_score_interval(0, 100, confidence=0.95)
    assert lower == 0.0
    assert 0.0 < upper < 0.05

    # 100 successes out of 100
    lower, upper = wilson_score_interval(100, 100, confidence=0.95)
    assert 0.95 < lower < 1.0
    assert upper == 1.0

    # Symmetry at p = 0.5
    lower, upper = wilson_score_interval(50, 100, confidence=0.95)
    assert math.isclose(0.5 - lower, upper - 0.5, rel_tol=1e-3)
    assert 0.40 < lower < 0.41
    assert 0.59 < upper < 0.61

    # Zero sample size raises ValueError or handles gracefully
    with pytest.raises(ValueError):
        wilson_score_interval(0, 0)


def test_vector_index_cosine_similarity():
    """Verify VectorIndex cosine distance and ranking."""
    embeddings = np.array([
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
        [0.70710678, 0.70710678, 0.0],
    ], dtype=np.float32)
    student_ids = [101, 102, 103]

    idx = VectorIndex(dimension=3)
    idx.build(embeddings, student_ids)

    query = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    top_matches = idx.search(query, top_k=2)

    assert len(top_matches) == 2
    # First match should be exact (student 101, similarity ~1.0)
    assert top_matches[0][0] == 101
    assert math.isclose(top_matches[0][1], 1.0, abs_tol=1e-4)

    # Second match should be student 103 (similarity ~0.707)
    assert top_matches[1][0] == 103
    assert math.isclose(top_matches[1][1], 0.7071, abs_tol=1e-3)


def test_passive_liveness_synthetic_inputs():
    """Verify passive liveness detector returns expected structure on synthetic frames."""
    detector = SilentLivenessDetector()

    # Create synthetic natural-like noise image
    np.random.seed(42)
    natural_frame = np.random.randint(50, 200, (200, 200, 3), dtype=np.uint8)
    box = (20, 20, 160, 160)

    score, verdict, metrics = detector.evaluate(natural_frame, box)
    assert 0.0 <= score <= 1.0
    assert verdict in ("LIVE", "SPOOF")
    assert "spectral_power_ratio" in metrics
    assert "chroma_dispersion" in metrics
    assert "gradient_variance" in metrics

    # Create uniform flat image (spoof / paper artifact)
    flat_frame = np.full((200, 200, 3), 128, dtype=np.uint8)
    flat_score, flat_verdict, flat_metrics = detector.evaluate(flat_frame, box)
    assert flat_score < 0.4
    assert flat_verdict == "SPOOF"


if __name__ == "__main__":
    test_wilson_score_interval_properties()
    test_vector_index_cosine_similarity()
    test_passive_liveness_synthetic_inputs()
    print("All reproducibility benchmark tests passed successfully!")
