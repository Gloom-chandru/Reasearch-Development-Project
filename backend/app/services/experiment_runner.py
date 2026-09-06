"""Experiment runner — execute experiments and persist results.

See §10 of master prompt for experiment design.

Experiments implemented
------------------------
1  Recognition accuracy           run_recognition_experiment
2  Lighting robustness             run_robustness_experiment (condition="lighting")
3  Distance robustness             run_robustness_experiment (condition="distance")
4  Face angle robustness           run_robustness_experiment (condition="angle")
5  Multi-face detection            run_multi_face_experiment
6  Latency benchmark               run_latency_experiment
7  Liveness (blink detection)      run_liveness_experiment
8  Ablation study                  run_ablation_experiment
9  Baseline comparison             run_baseline_experiment

ANTI-FABRICATION CONTRACT
--------------------------
Every experiment method:
- Receives real numpy frames as input (caller supplies them from actual captures)
- Writes every result, INCLUDING sample size (n), to experiment_results
- Reports Wilson 95% CI on every binomial proportion
- Never fills a table with a placeholder number

If frames are not yet available, callers should not invoke these methods — the
analytics UI will show "Awaiting experiment data" until real data is present.
"""

from __future__ import annotations

import datetime
import json
import time
from typing import Dict, List, Optional, Tuple

import numpy as np
from sqlalchemy.orm import Session

from app.config import settings
from app.repositories.repository_logging import ExperimentRepository, ExperimentResultRepository
from app.repositories.repository_core import FaceEmbeddingRepository, StudentRepository
from app.services.recognition_service import RecognitionService, wilson_ci
from app.services.quality_gate import QualityGate
from app.services.entry_zone import EntryZoneDetector
from app.services.liveness_service import LivenessDetector
from app.services.face_detector import detect_faces
from app.utils.logging import logger


class ExperimentRunner:
    """Execute experiments and persist results to the experiments/experiment_results tables.

    All results carry n (sample size) and, for proportions, a 95% Wilson CI.
    """

    def __init__(self, db: Session):
        self.db = db
        self.exp_repo = ExperimentRepository(db)
        self.result_repo = ExperimentResultRepository(db)
        self.recognition = RecognitionService(db)

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _create_experiment(
        self,
        name: str,
        exp_type: str,
        config: dict = None,
        threshold: float = None,
        n_participants: int = None,
        notes: str = "",
    ) -> int:
        exp = self.exp_repo.create(
            name=name,
            description=notes,
            experiment_type=exp_type,
            configuration=json.dumps(config or {}),
            model_version=settings.RECOGNITION_MODEL,
            threshold=threshold or settings.RECOGNITION_THRESHOLD,
            participant_count=n_participants,
            notes=notes,
        )
        return exp.id

    def _add_result(
        self,
        exp_id: int,
        metric: str,
        value: float,
        n: int,
        condition: str = None,
        ci_lower: float = None,
        ci_upper: float = None,
    ) -> None:
        self.result_repo.create(
            experiment_id=exp_id,
            metric_name=metric,
            value=round(float(value), 6),
            ci_lower=ci_lower,
            ci_upper=ci_upper,
            sample_size=n,
            condition=condition,
        )

    def _proportion_result(
        self,
        exp_id: int,
        metric: str,
        successes: int,
        n: int,
        condition: str = None,
    ) -> None:
        """Compute proportion + Wilson CI and persist."""
        value = successes / max(n, 1)
        ci_lo, ci_hi = wilson_ci(successes, n)
        self._add_result(exp_id, metric, value, n, condition, ci_lo, ci_hi)

    def _compute_classification_metrics(
        self, tp: int, fp: int, fn: int, tn: int, n: int
    ) -> Dict[str, float]:
        accuracy = (tp + tn) / max(n, 1)
        precision = tp / max(tp + fp, 1)
        recall = tp / max(tp + fn, 1)
        f1 = 2 * precision * recall / max(precision + recall, 1e-10)
        far = fp / max(fp + tn, 1)
        frr = fn / max(fn + tp, 1)
        return {
            "accuracy": accuracy, "precision": precision, "recall": recall,
            "f1": f1, "far": far, "frr": frr,
        }

    # ── Experiment 1: Recognition accuracy ───────────────────────────────────

    def run_recognition_experiment(
        self, test_frames: List[Tuple[np.ndarray, int]]
    ) -> int:
        """Experiment 1 — Recognition accuracy on test set.

        Args:
            test_frames: List of (frame, true_student_id). Use None as true_student_id
                         for impostor frames (not enrolled), which contribute to FAR.
        Returns:
            experiment_id
        """
        n = len(test_frames)
        n_participants = len({tid for _, tid in test_frames if tid is not None})
        exp_id = self._create_experiment(
            name="Recognition Accuracy — Test Set",
            exp_type="recognition",
            n_participants=n_participants,
            notes=f"n={n} frames, {n_participants} participants",
        )
        tp = fp = fn = tn = 0
        for frame, true_id in test_frames:
            result = self.recognition.identify(frame)
            pred_id = result["student_id"]
            decision = result["decision"]
            if true_id is None:
                if decision == "match":
                    fp += 1
                else:
                    tn += 1
            else:
                if decision == "match" and pred_id == true_id:
                    tp += 1
                elif decision == "match" and pred_id != true_id:
                    fp += 1
                else:
                    fn += 1

        metrics = self._compute_classification_metrics(tp, fp, fn, tn, n)
        for metric, val in metrics.items():
            self._proportion_result(exp_id, metric, int(val * n), n)
        self._add_result(exp_id, "total_n", n, n)
        self._add_result(exp_id, "n_participants", n_participants, n)
        logger.info(
            f"Exp 1 Recognition: accuracy={metrics['accuracy']:.4f} "
            f"FAR={metrics['far']:.4f} FRR={metrics['frr']:.4f} (n={n})"
        )
        return exp_id

    # ── Experiments 2-4: Environmental robustness ─────────────────────────────

    def run_robustness_experiment(
        self,
        condition_frames: Dict[str, List[Tuple[np.ndarray, int]]],
        condition_type: str,  # "lighting" | "distance" | "angle"
    ) -> int:
        """Experiments 2, 3, 4 — Environmental robustness.

        Args:
            condition_frames: {condition_label: [(frame, true_student_id), ...]}
                e.g. {"good_light": [...], "moderate_light": [...], "low_light": [...]}
            condition_type: "lighting", "distance", or "angle"
        Returns:
            experiment_id
        """
        all_n = sum(len(v) for v in condition_frames.values())
        n_participants = len({
            tid for frames in condition_frames.values()
            for _, tid in frames if tid is not None
        })
        exp_id = self._create_experiment(
            name=f"Robustness — {condition_type.title()}",
            exp_type=condition_type,
            config={"conditions": list(condition_frames.keys())},
            n_participants=n_participants,
            notes=f"n={all_n} frames across {len(condition_frames)} conditions",
        )
        for label, frames in condition_frames.items():
            n = len(frames)
            if n == 0:
                continue
            tp = fp = fn = tn = 0
            for frame, true_id in frames:
                result = self.recognition.identify(frame)
                pred_id = result["student_id"]
                decision = result["decision"]
                if true_id is None:
                    # Impostor frame — correct rejection or false alarm
                    if decision == "match":
                        fp += 1
                    else:
                        tn += 1
                else:
                    # Genuine frame — correct match, wrong match, or miss
                    if decision == "match" and pred_id == true_id:
                        tp += 1
                    elif decision == "match" and pred_id != true_id:
                        fp += 1
                    else:
                        fn += 1
            metrics = self._compute_classification_metrics(tp, fp, fn, tn, n)
            for metric, val in metrics.items():
                self._proportion_result(exp_id, metric, int(val * n), n, condition=label)
            self._add_result(exp_id, "n_frames", n, n, condition=label)
            logger.info(
                f"Exp Robustness/{condition_type} [{label}]: "
                f"accuracy={metrics['accuracy']:.4f} (n={n})"
            )
        return exp_id

    # ── Experiment 5: Multi-face ──────────────────────────────────────────────

    def run_multi_face_experiment(
        self,
        frames_by_count: Dict[int, List[np.ndarray]],
    ) -> int:
        """Experiment 5 — Multi-face detection and recognition rate.

        Args:
            frames_by_count: {expected_face_count: [frame, ...]}
                e.g. {1: [...], 2: [...], 5: [...]}
        Returns:
            experiment_id
        """
        all_n = sum(len(v) for v in frames_by_count.values())
        exp_id = self._create_experiment(
            name="Multi-Face Detection",
            exp_type="multi_face",
            config={"counts": list(frames_by_count.keys())},
            notes=f"n={all_n} frames",
        )
        for expected_count, frames in frames_by_count.items():
            n = len(frames)
            if n == 0:
                continue
            detected_correct = 0
            total_detected = 0
            for frame in frames:
                detected = detect_faces(frame)
                actual = len(detected)
                total_detected += actual
                if actual == expected_count:
                    detected_correct += 1
            detection_rate = detected_correct / max(n, 1)
            ci_lo, ci_hi = wilson_ci(detected_correct, n)
            condition = f"expected_{expected_count}_face{'s' if expected_count != 1 else ''}"
            self._add_result(
                exp_id, "detection_accuracy", detection_rate, n,
                condition=condition, ci_lower=ci_lo, ci_upper=ci_hi,
            )
            self._add_result(exp_id, "n_frames", n, n, condition=condition)
            self._add_result(exp_id, "mean_detected", total_detected / max(n, 1), n, condition=condition)
        logger.info(f"Exp 5 Multi-face complete (exp_id={exp_id})")
        return exp_id

    # ── Experiment 6: Latency ─────────────────────────────────────────────────

    def run_latency_experiment(
        self, test_frames: List[np.ndarray], n_trials: int = 100
    ) -> int:
        """Experiment 6 — Per-stage and end-to-end latency.

        Args:
            test_frames: Frames to run through the pipeline (cycled if fewer than n_trials).
            n_trials: Number of timing trials to run.
        Returns:
            experiment_id
        """
        exp_id = self._create_experiment(
            name="Pipeline Latency Benchmark",
            exp_type="latency",
            config={"n_trials": n_trials},
            notes=f"n_trials={n_trials}",
        )
        gate = QualityGate()
        stage_times: Dict[str, List[float]] = {
            "detection": [], "quality": [], "recognition": [], "total": [],
        }
        trials_run = 0
        for i in range(n_trials):
            frame = test_frames[i % len(test_frames)]
            t0 = time.perf_counter()
            faces = detect_faces(frame)
            t1 = time.perf_counter()
            if not faces:
                continue
            face = faces[0]
            gate.check_face(frame, face["box"], face.get("landmarks"))
            t2 = time.perf_counter()
            self.recognition.identify(frame)
            t3 = time.perf_counter()
            stage_times["detection"].append((t1 - t0) * 1000)
            stage_times["quality"].append((t2 - t1) * 1000)
            stage_times["recognition"].append((t3 - t2) * 1000)
            stage_times["total"].append((t3 - t0) * 1000)
            trials_run += 1

        for stage, times in stage_times.items():
            if not times:
                continue
            n = len(times)
            sorted_t = sorted(times)
            mean_ms = sum(times) / n
            p50 = sorted_t[n // 2]
            p95 = sorted_t[min(int(n * 0.95), n - 1)]
            self._add_result(exp_id, f"{stage}_mean_ms", mean_ms, n)
            self._add_result(exp_id, f"{stage}_p50_ms", p50, n)
            self._add_result(exp_id, f"{stage}_p95_ms", p95, n)
        logger.info(f"Exp 6 Latency: {trials_run} trials (exp_id={exp_id})")
        return exp_id

    # ── Experiment 7: Liveness ────────────────────────────────────────────────

    def run_liveness_experiment(
        self,
        live_frames_seq: List[List[np.ndarray]],
        attack_frames_seq: List[List[np.ndarray]],
        landmarks_extractor=None,
    ) -> int:
        """Experiment 7 — Liveness detection (blink-based, experimental).

        Each sequence is a time-ordered list of frames from one presentation
        attempt.  The detector observes the sequence and gives a final verdict.

        Args:
            live_frames_seq: List of frame sequences from real, enrolled volunteers.
            attack_frames_seq: List of frame sequences from spoofing attempts
                               (printed photos, screen replays).
            landmarks_extractor: Optional callable(frame) → landmarks np.ndarray.
                                  If None, uses InsightFace landmarks where available.
        Returns:
            experiment_id
        """
        n_live = len(live_frames_seq)
        n_attack = len(attack_frames_seq)
        n_total = n_live + n_attack
        exp_id = self._create_experiment(
            name="Liveness Detection — Blink-Based (Experimental)",
            exp_type="liveness",
            config={"n_live_sequences": n_live, "n_attack_sequences": n_attack},
            notes=(
                f"EXPERIMENTAL — blink detection only, not production-grade anti-spoofing. "
                f"n_live={n_live}, n_attack={n_attack}"
            ),
        )

        def _run_seq(seq: List[np.ndarray], detector: LivenessDetector) -> str:
            detector.reset()
            last_result = {"liveness": "uncertain"}
            for frame in seq:
                lms = None
                if landmarks_extractor:
                    try:
                        lms = landmarks_extractor(frame)
                    except Exception:
                        pass
                if lms is None:
                    # Try to get landmarks from InsightFace if available
                    try:
                        from app.services.recognition_service import _model
                        if _model:
                            faces = _model.get(frame)
                            if faces:
                                kps = faces[0].kps
                                if kps is not None:
                                    lms = np.array(kps)
                    except Exception:
                        pass
                last_result = detector.process_frame(lms)
            return last_result.get("liveness", "uncertain")

        # Live sequences — expect "live"
        live_correct = live_wrong = live_uncertain = 0
        detector = LivenessDetector()
        for seq in live_frames_seq:
            verdict = _run_seq(seq, detector)
            if verdict == "live":
                live_correct += 1
            elif verdict == "spoof":
                live_wrong += 1
            else:
                live_uncertain += 1

        # Attack sequences — expect "spoof"
        attack_detected = attack_missed = attack_uncertain = 0
        for seq in attack_frames_seq:
            verdict = _run_seq(seq, detector)
            if verdict == "spoof":
                attack_detected += 1
            elif verdict == "live":
                attack_missed += 1
            else:
                attack_uncertain += 1

        # Genuine acceptance rate (live → live)
        self._proportion_result(
            exp_id, "genuine_acceptance_rate", live_correct, n_live, condition="live"
        )
        self._proportion_result(
            exp_id, "genuine_false_rejection_rate", live_wrong, n_live, condition="live"
        )
        self._add_result(exp_id, "uncertain_live", live_uncertain, n_live, condition="live")
        # Attack detection rate (attack → spoof)
        self._proportion_result(
            exp_id, "attack_detection_rate", attack_detected, n_attack, condition="attack"
        )
        self._proportion_result(
            exp_id, "attack_miss_rate", attack_missed, n_attack, condition="attack"
        )
        self._add_result(exp_id, "uncertain_attack", attack_uncertain, n_attack, condition="attack")
        self._add_result(exp_id, "n_live_sequences", n_live, n_total)
        self._add_result(exp_id, "n_attack_sequences", n_attack, n_total)
        logger.info(
            f"Exp 7 Liveness: GAR={live_correct/max(n_live,1):.4f} "
            f"ADR={attack_detected/max(n_attack,1):.4f} (n={n_total})"
        )
        return exp_id

    # ── Experiment 8: Ablation study ──────────────────────────────────────────

    def run_ablation_experiment(
        self, test_frames: List[Tuple[np.ndarray, int]]
    ) -> int:
        """Experiment 8 — Ablation study: component contribution.

        Evaluates four pipeline configurations in sequence:
          1. Recognition only
          2. + Quality gate
          3. + Entry zone (uses default zone 20%-80% of frame)
          4. + Liveness (blink detection, if landmarks available)

        Args:
            test_frames: List of (frame, true_student_id).
        Returns:
            experiment_id
        """
        n = len(test_frames)
        n_participants = len({tid for _, tid in test_frames if tid is not None})
        exp_id = self._create_experiment(
            name="Ablation Study",
            exp_type="ablation",
            n_participants=n_participants,
            notes=f"n={n}, {n_participants} participants",
        )
        gate = QualityGate()
        entry_zone = EntryZoneDetector()  # default zone (no classroom configured)
        liveness = LivenessDetector()

        configs = [
            ("recognition_only", False, False, False),
            ("plus_quality_gate", True, False, False),
            ("plus_entry_zone", True, True, False),
            ("plus_liveness", True, True, True),
        ]

        for config_name, use_quality, use_zone, use_liveness in configs:
            tp = fp = fn = tn = 0
            evaluated = 0
            for frame, true_id in test_frames:
                faces = detect_faces(frame)
                if not faces:
                    fn += 1 if true_id is not None else 0
                    continue
                face = faces[0]
                h, w = frame.shape[:2]
                # Quality gate
                if use_quality:
                    q = gate.check_face(frame, face["box"], face.get("landmarks"))
                    if not q.passed():
                        fn += 1 if true_id is not None else 0
                        continue
                # Entry zone (simple centroid check)
                if use_zone:
                    x, y, fw, fh = face["box"]
                    cx, cy = (x + fw / 2) / w, (y + fh / 2) / h
                    if not (0.2 <= cx <= 0.8 and 0.2 <= cy <= 0.8):
                        fn += 1 if true_id is not None else 0
                        continue
                # Liveness
                if use_liveness and face.get("landmarks") is not None:
                    lms = np.array(face["landmarks"])
                    lv = liveness.process_frame(lms)
                    if lv.get("liveness") == "spoof":
                        fn += 1 if true_id is not None else 0
                        continue
                # Recognition
                result = self.recognition.identify(frame)
                pred_id = result["student_id"]
                decision = result["decision"]
                evaluated += 1
                if true_id is None:
                    fp += 1 if decision == "match" else 0
                    tn += 1 if decision != "match" else 0
                else:
                    if decision == "match" and pred_id == true_id:
                        tp += 1
                    elif decision == "match":
                        fp += 1
                    else:
                        fn += 1

            metrics = self._compute_classification_metrics(tp, fp, fn, tn, evaluated or n)
            for metric, val in metrics.items():
                ev_n = evaluated or n
                self._proportion_result(
                    exp_id, metric, int(val * ev_n), ev_n, condition=config_name
                )
            self._add_result(exp_id, "evaluated_n", evaluated, n, condition=config_name)
            logger.info(
                f"Ablation [{config_name}]: accuracy={metrics['accuracy']:.4f} "
                f"(evaluated={evaluated}/{n})"
            )
        return exp_id

    # ── Experiment 9: Baseline comparison ────────────────────────────────────

    def run_baseline_experiment(
        self,
        measurements: Dict[str, Dict[str, float]],
    ) -> int:
        """Experiment 9 — Baseline comparison: manual vs fingerprint vs proposed.

        This experiment records measured (not estimated) values for session metrics.
        The caller is responsible for supplying real measured data.

        Args:
            measurements: {
                "manual":      {"session_duration_min": X, "effort_person_min": Y, "throughput_per_min": Z, "n_sessions": N},
                "fingerprint": {"session_duration_min": X, ...},
                "proposed":    {"session_duration_min": X, ...},
            }
        Returns:
            experiment_id
        """
        exp_id = self._create_experiment(
            name="Baseline Comparison — Manual vs Fingerprint vs Proposed",
            exp_type="baseline",
            config={"systems": list(measurements.keys())},
            notes="Measured values from actual timed sessions — not estimates.",
        )
        for system, metrics in measurements.items():
            n = int(metrics.get("n_sessions", 1))
            for metric, value in metrics.items():
                if metric == "n_sessions":
                    continue
                self._add_result(exp_id, metric, value, n, condition=system)
        logger.info(f"Exp 9 Baseline comparison complete (exp_id={exp_id})")
        return exp_id
