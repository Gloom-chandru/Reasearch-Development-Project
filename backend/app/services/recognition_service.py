"""Recognition service — embedding generation, similarity, threshold selection.

Uses InsightFace as the primary recognition backend.
"""

from __future__ import annotations

from typing import List, Optional, Tuple

import numpy as np
from sqlalchemy.orm import Session

from app.config import settings
from app.repositories.repository_core import StudentRepository, FaceEmbeddingRepository
from app.repositories.repository_logging import ExperimentResultRepository
from app.utils.logging import logger

# Module-level model reference (lazy-loaded)
_model = None
_model_name = None


def _load_model() -> bool:
    """Lazy-load InsightFace recognition model. Returns True if loaded."""
    global _model, _model_name
    if _model is not None:
        return True
    try:
        import insightface
        from insightface.app import FaceAnalysis
        app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        app.prepare(ctx_id=0, det_size=(640, 640))
        _model = app
        _model_name = "insightface_buffalo_l"
        logger.info("Recognition model: InsightFace buffalo_l loaded")
        return True
    except Exception as e:
        logger.warning(f"InsightFace model load failed: {e}")
    _model = None
    _model_name = "none"
    logger.warning("No recognition model available")
    return False


def model_name() -> str:
    _load_model()
    return _model_name or "none"


def get_embedding(frame: np.ndarray) -> Optional[np.ndarray]:
    """Generate a 512-d normalized face embedding from a BGR frame."""
    _load_model()
    if _model is None:
        logger.error("No recognition model loaded")
        return None
    try:
        faces = _model.get(frame)
        if not faces:
            return None
        face = max(faces, key=lambda f: f.det_score)
        emb = face.embedding
        norm = np.linalg.norm(emb)
        return (emb / norm).astype(np.float32) if norm > 0 else emb.astype(np.float32)
    except Exception as e:
        logger.warning(f"Embedding generation failed: {e}")
        return None


def cosine_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    """Cosine similarity between two normalized embeddings. 1 = identical."""
    if emb1.shape != emb2.shape:
        return -1.0
    return float(np.dot(emb1, emb2))


def wilson_ci(successes: int, trials: int, z: float = 1.96) -> Tuple[float, float]:
    """Wilson score interval for binomial proportion 95% CI."""
    if trials == 0:
        return (0.0, 0.0)
    p = successes / trials
    denom = 1 + z**2 / trials
    centre = p + z**2 / (2 * trials)
    margin = z * ((p * (1 - p) + z**2 / (4 * trials)) / trials) ** 0.5
    lower = (centre - margin) / denom
    upper = (centre + margin) / denom
    return (max(0.0, lower), min(1.0, upper))
class RecognitionService:
    """Face recognition: enrollment, identification, threshold sweep."""

    def __init__(self, db: Session):
        self.db = db
        self.student_repo = StudentRepository(db)
        self.embedding_repo = FaceEmbeddingRepository(db)
        _load_model()

    def enroll_face(
        self, student_id: int, frame: np.ndarray,
        quality_label: str = "GOOD", quality_reason: str = "",
        capture_index: int = 0,
    ) -> Optional[int]:
        embedding = get_embedding(frame)
        if embedding is None:
            logger.warning(f"Enrollment failed: no face for student={student_id}")
            return None
        emb_bytes = embedding.tobytes()
        emb_record = self.embedding_repo.create(
            student_id=student_id, embedding=emb_bytes,
            dimension=len(embedding), quality_label=quality_label,
            quality_reason=quality_reason, capture_index=capture_index,
        )
        student = self.student_repo.get(student_id)
        if student:
            self.student_repo.update(student_id, enrollment_count=student.enrollment_count + 1)
        logger.info(f"Enrolled face student={student_id} emb_id={emb_record.id}")
        return emb_record.id

    def identify(
        self, frame: np.ndarray, threshold: Optional[float] = None,
    ) -> dict:
        """Identify a face against all enrolled embeddings.

        Returns dict with keys: student_id, similarity, decision, all_similarities.
        """
        if threshold is None:
            threshold = settings.RECOGNITION_THRESHOLD
        query_emb = get_embedding(frame)
        if query_emb is None:
            return {"student_id": None, "similarity": 0.0, "decision": "unknown", "all_similarities": []}
        all_emb = self.embedding_repo.get_all_embeddings()
        if not all_emb:
            return {"student_id": None, "similarity": 0.0, "decision": "unknown", "all_similarities": []}

        sims = []
        for e in all_emb:
            stored = np.frombuffer(e.embedding, dtype=np.float32)
            if stored.shape == query_emb.shape:
                sims.append((e.student_id, cosine_similarity(query_emb, stored)))

        student_sims = {}
        for sid, sim in sims:
            if sid not in student_sims or sim > student_sims[sid]:
                student_sims[sid] = sim
        sorted_sims = sorted(student_sims.items(), key=lambda x: x[1], reverse=True)
        if not sorted_sims:
            return {"student_id": None, "similarity": 0.0, "decision": "unknown", "all_similarities": []}

        best_id, best_sim = sorted_sims[0]
        if best_sim >= threshold:
            decision = "match"
        elif best_sim >= threshold * 0.7:
            decision = "low_confidence"
        else:
            decision = "unknown"
        return {
            "student_id": best_id, "similarity": round(best_sim, 6),
            "decision": decision,
            "all_similarities": [(sid, round(s, 6)) for sid, s in sorted_sims[:5]],
        }

    def sweep_threshold(
        self, validation_frames: List[Tuple[np.ndarray, int]],
        candidate_thresholds: Optional[List[float]] = None,
        experiment_id: Optional[int] = None,
    ) -> Tuple[float, dict]:
        """Sweep thresholds against validation set to select operating point (FAR approx equal to FRR)."""
        if candidate_thresholds is None:
            candidate_thresholds = [round(0.30 + i * 0.05, 2) for i in range(9)]
        results = {}
        n = len(validation_frames)
        for thr in candidate_thresholds:
            tp = fp = fn = 0
            for frame, true_id in validation_frames:
                r = self.identify(frame, threshold=thr)
                pid = r["student_id"]
                if pid is not None and pid == true_id:
                    tp += 1
                elif pid is not None and pid != true_id:
                    fp += 1
                elif pid is None and true_id is not None:
                    fn += 1
            results[thr] = {
                "accuracy": round(tp / max(n, 1), 4),
                "precision": round(tp / max(tp + fp, 1), 4),
                "recall": round(tp / max(tp + fn, 1), 4),
                "f1": round(2 * tp / max(2 * tp + fp + fn, 1), 4),
                "far": round(fp / max(n, 1), 4),
                "frr": round(fn / max(n, 1), 4),
                "n": n,
            }
        best_thr = min(candidate_thresholds, key=lambda t: abs(results[t]["far"] - results[t]["frr"]))
        if experiment_id:
            repo = ExperimentResultRepository(self.db)
            for thr, res in results.items():
                for m in ("accuracy", "precision", "recall", "f1", "far", "frr"):
                    repo.create(experiment_id=experiment_id, metric_name=f"t_{thr:.2f}_{m}",
                                value=res[m], sample_size=n, condition=f"threshold={thr:.2f}")
        logger.info(f"Threshold sweep: selected={best_thr:.2f} n={n}")
        return best_thr, results