"""Experiment runner — execute experiments and persist results.

See §10 of master prompt for experiment design.
"""

from __future__ import annotations

import datetime
import json
import time
from typing import List, Optional, Tuple

import cv2
import numpy as np
from sqlalchemy.orm import Session

from app.config import settings
from app.repositories.repository_logging import ExperimentRepository, ExperimentResultRepository
from app.repositories.repository_core import FaceEmbeddingRepository, StudentRepository
from app.services.recognition_service import RecognitionService, cosine_similarity, wilson_ci
from app.services.quality_gate import QualityGate
from app.services.entry_zone import EntryZoneDetector
from app.services.liveness_service import LivenessDetector
from app.services.face_detector import detect_faces
from app.utils.logging import logger


class ExperimentRunner:
    """Execute experiments and persist results to DB."""

    def __init__(self, db: Session):
        self.db = db
        self.exp_repo = ExperimentRepository(db)
        self.result_repo = ExperimentResultRepository(db)
        self.recognition = RecognitionService(db)

    def _create_experiment(self, name: str, exp_type: str, config: str = None,
                           threshold: float = None, n_participants: int = None) -> int:
        exp = self.exp_repo.create(
            name=name,
            experiment_type=exp_type,
            configuration=config,
            model_version=settings.RECOGNITION_MODEL,
            threshold=threshold or settings.RECOGNITION_THRESHOLD,
            participant_count=n_participants,
        )
        return exp.id

    def _add_result(self, exp_id: int, metric: str, value: float,
                    n: int, condition: str = None, ci_lower: float = None, ci_upper: float = None):
        self.result_repo.create(
            experiment_id=exp_id,
            metric_name=metric,
            value=round(value, 6),
            ci_lower=ci_lower,
            ci_upper=ci_upper,
            sample_size=n,
            condition=condition,
        )
def run_recognition_experiment(
        self, test_frames: List[Tuple[np.ndarray, int]]
    ) -> int:
        """Experiment 1: Recognition accuracy on test set."""
        exp_id = self._create_experiment(
            name="Recognition Accuracy - Test Set",
            exp_type="recognition",
            n_participants=len(set(tid for _, tid in test_frames)),
        )
        correct = incorrect = unknown = false_alarms = false_rejections = 0
        n = len(test_frames)
        for frame, true_id in test_frames:
            result = self.recognition.identify(frame)
            pred_id = result["student_id"]
            decision = result["decision"]
            if decision == "match" and pred_id == true_id:
                correct += 1
            elif decision == "match" and pred_id != true_id:
                incorrect += 1; false_alarms += 1
            elif decision in ("unknown", "low_confidence"):
                unknown += 1; false_rejections += 1
            elif pred_id is None and true_id is not None:
                unknown += 1; false_rejections += 1
        accuracy = correct / max(n, 1)
        far = false_alarms / max(n, 1)
        frr = false_rejections / max(n, 1)
        precision = correct / max(correct + incorrect, 1)
        recall = correct / max(correct + false_rejections, 1)
        f1 = 2 * precision * recall / max(precision + recall, 1e-10)
        for metric, val in [
            ("accuracy", accuracy), ("precision", precision),
            ("recall", recall), ("f1", f1),
            ("far", far), ("frr", frr),
        ]:
            ci_lower, ci_upper = wilson_ci(int(val * n), n)
            self._add_result(exp_id, metric, val, n, ci_lower=ci_lower, ci_upper=ci_upper)
        self._add_result(exp_id, "total_n", n, n)
        logger.info(f"Recognition experiment: accuracy={accuracy:.4f} (n={n})")
        return exp_id

    def run_latency_experiment(self, test_frames: List[np.ndarray], n_trials: int = 100) -> int:
        """Experiment 6: Per-stage and end-to-end latency."""
        exp_id = self._create_experiment(
            name="Pipeline Latency Benchmark",
            exp_type="latency",
            n_participants=len(test_frames),
        )
        stage_times = {"detection": [], "quality": [], "recognition": [], "total": []}
        gate = QualityGate()
        trials_run = 0
        for frame in test_frames:
            if trials_run >= n_trials:
                break
            start = time.perf_counter()
            faces = detect_faces(frame)
            t_detect = time.perf_counter()
            if not faces:
                continue
            face = faces[0]
            gate.check_face(frame, face["box"], face.get("landmarks"))
            t_quality = time.perf_counter()
            self.recognition.identify(frame)
            t_recognition = time.perf_counter()
            stage_times["detection"].append((t_detect - start) * 1000)
            stage_times["quality"].append((t_quality - t_detect) * 1000)
            stage_times["recognition"].append((t_recognition - t_quality) * 1000)
            stage_times["total"].append((t_recognition - start) * 1000)
            trials_run += 1
        for stage, times in stage_times.items():
            if times:
                mean = sum(times) / len(times)
                sorted_t = sorted(times)
                p50 = sorted_t[len(sorted_t) // 2]
                p95 = sorted_t[int(len(sorted_t) * 0.95)]
                self._add_result(exp_id, f"{stage}_mean_ms", mean, len(times))
                self._add_result(exp_id, f"{stage}_p50_ms", p50, len(times))
                self._add_result(exp_id, f"{stage}_p95_ms", p95, len(times))
        logger.info(f"Latency experiment: {trials_run} trials")
        return exp_id

    def run_ablation_experiment(
        self, test_frames: List[Tuple[np.ndarray, int]]
    ) -> int:
        """Ablation study: evaluate component contribution."""
        exp_id = self._create_experiment(
            name="Ablation Study",
            exp_type="ablation",
            n_participants=len(set(tid for _, tid in test_frames)),
        )
        gate = QualityGate()
        for config_name, use_quality in [
            ("recognition_only", False), ("plus_quality", True)
        ]:
            correct = 0
            total = 0
            for frame, true_id in test_frames:
                faces = detect_faces(frame)
                if not faces:
                    continue
                if use_quality and not gate.check_face(
                    frame, faces[0]["box"], faces[0].get("landmarks")
                ).passed():
                    continue
                result = self.recognition.identify(frame)
                total += 1
                if result["student_id"] == true_id and result["decision"] == "match":
                    correct += 1
            if total > 0:
                acc = correct / total
                ci_low, ci_high = wilson_ci(correct, total)
                self._add_result(exp_id, f"{config_name}_accuracy", acc, total,
                               ci_lower=ci_low, ci_upper=ci_high)
        logger.info(f"Ablation experiment complete (exp_id={exp_id})")
        return exp_id