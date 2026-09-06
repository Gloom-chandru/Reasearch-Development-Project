"""Unit tests for all statistical functions in the project.

Tests are deliberately independent of the DB / FastAPI stack so they run fast
and without fixtures.  Every function tested here is used in the final
research report — a failing test here means a wrong number in the thesis.

Covers:
  - wilson_ci()                           (recognition_service.py)
  - _compute_classification_metrics()    (experiment_runner.py)
  - run_robustness_experiment() tn-bug    (experiment_runner.py) — regression test
  - BaseRepository.update() UNSET        (repositories/base.py)
"""

from __future__ import annotations

import math
import os
import sys

import pytest

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-stats-key-not-for-production")


# ── wilson_ci ─────────────────────────────────────────────────────────────────

from app.services.recognition_service import wilson_ci


class TestWilsonCI:
    """95% Wilson score confidence intervals for proportions."""

    def test_zero_trials_returns_zeros(self):
        lo, hi = wilson_ci(0, 0)
        assert lo == 0.0
        assert hi == 0.0

    def test_all_successes(self):
        """100/100 → CI should be close to 1.0 on both ends."""
        lo, hi = wilson_ci(100, 100)
        assert lo > 0.95, f"Expected lower bound > 0.95, got {lo}"
        assert hi == pytest.approx(1.0, abs=1e-9)

    def test_no_successes(self):
        """0/100 → CI should include 0.0 and upper bound should be small."""
        lo, hi = wilson_ci(0, 100)
        assert lo == 0.0
        assert hi < 0.05, f"Expected upper bound < 0.05, got {hi}"

    def test_half_successes(self):
        """50/100 → interval should be symmetric around 0.5."""
        lo, hi = wilson_ci(50, 100)
        mid = (lo + hi) / 2
        assert abs(mid - 0.5) < 0.02, f"Expected midpoint near 0.5, got {mid}"
        assert lo < 0.5 < hi

    def test_small_n_produces_wide_ci(self):
        """5/10 → CI should be wide (this is the small-n warning case)."""
        lo, hi = wilson_ci(5, 10)
        width = hi - lo
        assert width > 0.3, f"Expected wide CI for n=10, got width={width:.3f}"

    def test_bounds_always_in_0_1(self):
        """CI bounds must always be in [0, 1] regardless of inputs."""
        for successes, trials in [(0, 1), (1, 1), (3, 5), (99, 100), (1, 1000)]:
            lo, hi = wilson_ci(successes, trials)
            assert 0.0 <= lo <= 1.0, f"Lower bound {lo} out of [0,1] for {successes}/{trials}"
            assert 0.0 <= hi <= 1.0, f"Upper bound {hi} out of [0,1] for {successes}/{trials}"
            assert lo <= hi, f"Lower {lo} > upper {hi} for {successes}/{trials}"

    def test_known_value(self):
        """Known result: 8/20 success rate.

        According to standard Wilson score formula at z=1.96:
        p = 0.4, n = 20 → approximately [0.209, 0.627].
        """
        lo, hi = wilson_ci(8, 20)
        assert 0.18 < lo < 0.25, f"Lower bound {lo:.4f} outside expected range for 8/20"
        assert 0.60 < hi < 0.68, f"Upper bound {hi:.4f} outside expected range for 8/20"


# ── _compute_classification_metrics ──────────────────────────────────────────

# We test through ExperimentRunner to avoid importing private internals
import json
import numpy as np
from unittest.mock import MagicMock, patch

from app.services.experiment_runner import ExperimentRunner


def _make_runner():
    """Create an ExperimentRunner with a mocked DB that doesn't write."""
    mock_db = MagicMock()
    runner = ExperimentRunner.__new__(ExperimentRunner)
    runner.db = mock_db
    # Mock repos so _add_result / _proportion_result succeed silently
    runner.exp_repo = MagicMock()
    runner.result_repo = MagicMock()
    runner.recognition = MagicMock()
    return runner


class TestClassificationMetrics:
    """_compute_classification_metrics boundary cases."""

    def setup_method(self):
        self.runner = _make_runner()

    def _metrics(self, tp, fp, fn, tn):
        return self.runner._compute_classification_metrics(tp, fp, fn, tn, tp + fp + fn + tn)

    def test_perfect_classifier(self):
        m = self._metrics(tp=50, fp=0, fn=0, tn=50)
        assert m["accuracy"] == 1.0
        assert m["precision"] == 1.0
        assert m["recall"] == 1.0
        assert m["f1"] == 1.0
        assert m["far"] == 0.0
        assert m["frr"] == 0.0

    def test_all_false_alarms(self):
        """System accepts everyone including all impostors → FAR=1, FRR=0."""
        m = self._metrics(tp=50, fp=50, fn=0, tn=0)
        assert m["far"] == 1.0
        assert m["frr"] == 0.0
        assert m["precision"] == 0.5

    def test_all_false_rejections(self):
        """System rejects everyone → FAR=0, FRR=1."""
        m = self._metrics(tp=0, fp=0, fn=50, tn=50)
        assert m["far"] == 0.0
        assert m["frr"] == 1.0
        assert m["recall"] == 0.0

    def test_zero_denominator_safety(self):
        """n=0 should not divide-by-zero."""
        m = self.runner._compute_classification_metrics(0, 0, 0, 0, 0)
        for v in m.values():
            assert math.isfinite(v), f"Non-finite metric value: {v}"

    def test_accuracy_formula(self):
        """accuracy = (tp + tn) / n."""
        m = self._metrics(tp=30, fp=5, fn=10, tn=55)
        expected = (30 + 55) / 100
        assert abs(m["accuracy"] - expected) < 1e-9

    def test_far_formula(self):
        """FAR = FP / (FP + TN)."""
        m = self._metrics(tp=40, fp=10, fn=5, tn=45)
        expected = 10 / (10 + 45)
        assert abs(m["far"] - expected) < 1e-9

    def test_frr_formula(self):
        """FRR = FN / (FN + TP)."""
        m = self._metrics(tp=40, fp=10, fn=5, tn=45)
        expected = 5 / (5 + 40)
        assert abs(m["frr"] - expected) < 1e-9


# ── Regression test: tn bug in run_robustness_experiment ─────────────────────

class TestRobustnessExperimentTnBug:
    """Regression test for the tn += 1 bug.

    Before the fix: impostor frames never incremented tn, making FAR = 1.0
    for every condition.  After the fix: tn is counted correctly.
    """

    def test_tn_is_counted_for_impostors_correctly_rejected(self):
        """When the recogniser correctly rejects an impostor, tn must increment."""
        runner = _make_runner()

        # Simulate: 10 impostor frames, recogniser correctly rejects all (decision=unknown)
        impostor_frames = [(np.zeros((100, 100, 3), dtype=np.uint8), None)] * 10

        runner.recognition.identify.return_value = {
            "student_id": None,
            "decision": "unknown",
            "similarity": 0.1,
        }

        # Mock experiment creation
        runner.exp_repo.create.return_value = MagicMock(id=1)

        # Collect what _add_result / _proportion_result receive
        stored = []
        runner.result_repo.create.side_effect = lambda **kw: stored.append(kw)

        runner.run_robustness_experiment(
            condition_frames={"good_light": impostor_frames},
            condition_type="lighting",
        )

        # Find the FAR result for "good_light"
        far_row = next(
            (r for r in stored if r.get("metric_name") == "far" and r.get("condition") == "good_light"),
            None,
        )
        assert far_row is not None, "No FAR result stored for good_light condition"
        assert far_row["value"] == 0.0, (
            f"FAR should be 0.0 when all impostors are correctly rejected, "
            f"got {far_row['value']} — tn bug may have recurred"
        )

    def test_far_nonzero_when_impostors_accepted(self):
        """When the recogniser accepts an impostor, FAR > 0."""
        runner = _make_runner()

        impostor_frames = [(np.zeros((100, 100, 3), dtype=np.uint8), None)] * 10

        runner.recognition.identify.return_value = {
            "student_id": 42,
            "decision": "match",
            "similarity": 0.9,
        }
        runner.exp_repo.create.return_value = MagicMock(id=2)

        stored = []
        runner.result_repo.create.side_effect = lambda **kw: stored.append(kw)

        runner.run_robustness_experiment(
            condition_frames={"low_light": impostor_frames},
            condition_type="lighting",
        )

        far_row = next(
            (r for r in stored if r.get("metric_name") == "far" and r.get("condition") == "low_light"),
            None,
        )
        assert far_row is not None
        assert far_row["value"] == 1.0, (
            f"FAR should be 1.0 when all impostors are accepted, got {far_row['value']}"
        )


# ── UNSET sentinel in BaseRepository ─────────────────────────────────────────

from app.repositories.base import BaseRepository, UNSET
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.orm import sessionmaker
from app.models.base import Base as ORMBase


class _SampleModel(ORMBase):
    __tablename__ = "test_sample_model"
    id = Column(Integer, primary_key=True)
    name = Column(String(50))
    flag = Column(Boolean, default=True)
    optional = Column(String(50), nullable=True)


class TestBaseRepositoryUpdate:
    """BaseRepository.update() with the UNSET sentinel."""

    @pytest.fixture(autouse=True)
    def setup_db(self):
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
        )
        ORMBase.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        self.session = Session()
        self.repo = BaseRepository(_SampleModel, self.session)
        yield
        self.session.close()

    def test_update_single_field(self):
        obj = self.repo.create(name="Alice", flag=True, optional="x")
        updated = self.repo.update(obj.id, name="Bob")
        assert updated.name == "Bob"
        assert updated.flag == True       # untouched
        assert updated.optional == "x"   # untouched

    def test_update_nullable_to_none_clears_field(self):
        """Passing None explicitly should set the column to NULL."""
        obj = self.repo.create(name="Alice", optional="value")
        updated = self.repo.update(obj.id, optional=None)
        assert updated.optional is None, "None should clear the nullable field"

    def test_omitting_kwarg_leaves_field_unchanged(self):
        """Not passing a kwarg at all should leave the field unchanged."""
        obj = self.repo.create(name="Alice", flag=False)
        updated = self.repo.update(obj.id, name="Bob")
        assert updated.flag == False     # omitted → unchanged

    def test_update_nonexistent_id_returns_none(self):
        result = self.repo.update(9999, name="Ghost")
        assert result is None

    def test_bool_false_is_persisted(self):
        """False is falsy but not UNSET — it must be written to DB."""
        obj = self.repo.create(name="Test", flag=True)
        updated = self.repo.update(obj.id, flag=False)
        assert updated.flag == False, "False should update the field, not be skipped"
