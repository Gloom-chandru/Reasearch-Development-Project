"""Recognition service — embedding generation, similarity, threshold selection.

Uses InsightFace as the primary recognition backend.

EMBEDDING CACHE
---------------
Loading all face embeddings from the DB on every frame (up to 1000+ rows) is a
significant bottleneck.  We maintain a process-level in-memory cache keyed by
embedding ID.  The cache is invalidated when:
  - A new enrollment is added (enroll_face)
  - The caller explicitly calls invalidate_embedding_cache()

Because uvicorn runs in a single process with multiple threads sharing the same
interpreter, a module-level dict with a threading.Lock is sufficient.  For
multi-process deployments a shared-memory or Redis-based cache would be needed,
but that is out of scope for this prototype.
"""

from __future__ import annotations

import threading
from typing import Dict, List, Optional, Tuple

import numpy as np
from sqlalchemy.orm import Session

from app.config import settings
from app.repositories.repository_core import StudentRepository, FaceEmbeddingRepository
from app.repositories.repository_logging import ExperimentResultRepository
from app.utils.logging import logger

# ── InsightFace model (lazy-loaded) ───────────────────────────────────────────
_model = None
_model_name = None
_model_lock = threading.Lock()

# ── Embedding cache ───────────────────────────────────────────────────────────
# { embedding_db_id: (student_id, np.ndarray[float32]) }
_emb_cache: Dict[int, Tuple[int, np.ndarray]] = {}
_cache_lock = threading.Lock()
_cache_dirty = True  # True → reload from DB on next identify()


def invalidate_embedding_cache() -> None:
    """Mark the cache dirty so the next identify() reloads from DB."""
    global _cache_dirty
    with _cache_lock:
        _cache_dirty = True


def _refresh_cache_if_needed(emb_repo: FaceEmbeddingRepository) -> None:
    """Reload embeddings from DB if cache is dirty. Thread-safe."""
    global _emb_cache, _cache_dirty
    with _cache_lock:
        if not _cache_dirty:
            return
        all_emb = emb_repo.get_all_embeddings()
        new_cache: Dict[int, Tuple[int, np.ndarray]] = {}
        for e in all_emb:
            arr = np.frombuffer(e.embedding, dtype=np.float32).copy()
            new_cache[e.id] = (e.student_id, arr)
        _emb_cache = new_cache
        _cache_dirty = False
        logger.debug(f"Embedding cache refreshed: {len(new_cache)} embeddings loaded")


# ── Model loading ─────────────────────────────────────────────────────────────

def _load_model() -> bool:
    """Lazy-load InsightFace recognition model. Returns True if loaded."""
    global _model, _model_name
    with _model_lock:
        if _model is not None:
            return True
        try:
            from insightface.app import FaceAnalysis
            app = FaceAnalysis(name="buffalo_l", providers=["CUDAExecutionProvider", "CoreMLExecutionProvider", "CPUExecutionProvider"])
            app.prepare(ctx_id=0, det_size=(640, 640))
            _model = app
            _model_name = "insightface_buffalo_l"
            logger.info("Recognition model: InsightFace buffalo_l loaded")
            return True
        except Exception as e:
            logger.warning(f"InsightFace model load failed: {e}")
        _model = None
        _model_name = "none"
        logger.warning("No recognition model available — recognition will return 'unknown'")
        return False


def model_name() -> str:
    _load_model()
    return _model_name or "none"


def get_embedding(frame: np.ndarray) -> Optional[np.ndarray]:
    """Generate a 512-d normalized face embedding from a BGR frame.

    Returns None if model unavailable or no face detected.
    """
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


# ── Math helpers ──────────────────────────────────────────────────────────────

def cosine_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    """Cosine similarity between two normalized embeddings. 1 = identical."""
    if emb1.shape != emb2.shape:
        return -1.0
    return float(np.dot(emb1, emb2))


def wilson_ci(successes: int, trials: int, z: float = 1.96) -> Tuple[float, float]:
    """Wilson score 95% CI for a binomial proportion.

    Preferred over the normal approximation for small n.
    Returns (lower, upper) bounds in [0, 1].
    """
    if trials == 0:
        return (0.0, 0.0)
    p = successes / trials
    denom = 1 + z ** 2 / trials
    centre = p + z ** 2 / (2 * trials)
    margin = z * ((p * (1 - p) + z ** 2 / (4 * trials)) / trials) ** 0.5
    lower = (centre - margin) / denom
    upper = (centre + margin) / denom
    return (max(0.0, float(lower)), min(1.0, float(upper)))


def _faiss_search(query_emb: np.ndarray, cache_snapshot: dict) -> Dict[int, float]:
    """Perform FAISS index search if faiss is installed, falling back to vector dot product."""
    try:
        import faiss
        embeddings = []
        student_ids = []
        for emb_id, (student_id, stored_emb) in cache_snapshot.items():
            if stored_emb.shape == query_emb.shape:
                embeddings.append(stored_emb)
                student_ids.append(student_id)
        if not embeddings:
            return {}
        data_matrix = np.vstack(embeddings).astype(np.float32)
        dim = data_matrix.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(data_matrix)
        k = min(len(embeddings), 50)
        query_mat = np.expand_dims(query_emb, axis=0).astype(np.float32)
        similarities, indices = index.search(query_mat, k)
        student_best = {}
        for idx, sim in zip(indices[0], similarities[0]):
            if idx >= 0:
                sid = student_ids[idx]
                sim_val = float(sim)
                if sid not in student_best or sim_val > student_best[sid]:
                    student_best[sid] = sim_val
        return student_best
    except Exception:
        student_best = {}
        for emb_id, (student_id, stored_emb) in cache_snapshot.items():
            if stored_emb.shape == query_emb.shape:
                sim = cosine_similarity(query_emb, stored_emb)
                if student_id not in student_best or sim > student_best[student_id]:
                    student_best[student_id] = sim
        return student_best


# ── Service class ─────────────────────────────────────────────────────────────

class RecognitionService:
    """Face recognition: enrollment, identification, threshold sweep.

    The `identify()` method uses a process-level in-memory embedding cache to
    avoid issuing a full `SELECT *` against face_embeddings on every frame.
    The cache is invalidated automatically when a new face is enrolled.
    """

    def __init__(self, db: Session):
        self.db = db
        self.student_repo = StudentRepository(db)
        self.embedding_repo = FaceEmbeddingRepository(db)
        _load_model()

    # ── Enrollment ────────────────────────────────────────────────────────────

    def enroll_face(
        self,
        student_id: int,
        frame: np.ndarray,
        quality_label: str = "GOOD",
        quality_reason: str = "",
        capture_index: int = 0,
    ) -> Optional[int]:
        """Generate an embedding from `frame` and persist it for `student_id`.

        Invalidates the in-memory cache so the next identify() sees the new
        embedding immediately.
        """
        embedding = get_embedding(frame)
        if embedding is None:
            logger.warning(f"Enrollment failed: no face detected for student={student_id}")
            return None
        emb_record = self.embedding_repo.create(
            student_id=student_id,
            embedding=embedding.tobytes(),
            dimension=len(embedding),
            quality_label=quality_label,
            quality_reason=quality_reason,
            capture_index=capture_index,
        )
        student = self.student_repo.get(student_id)
        if student:
            self.student_repo.update(
                student_id, enrollment_count=student.enrollment_count + 1
            )
        # Invalidate cache so new embedding is picked up immediately
        invalidate_embedding_cache()
        logger.info(f"Enrolled face student={student_id} emb_id={emb_record.id}")
        return emb_record.id

    # ── Identification ────────────────────────────────────────────────────────

    def identify(
        self,
        frame: np.ndarray,
        threshold: Optional[float] = None,
    ) -> dict:
        """Identify the face in `frame` against all enrolled embeddings.

        Uses the in-memory cache: only hits the DB when the cache is dirty
        (e.g. after a new enrollment).  The cache is populated once and reused
        across all subsequent frames until invalidated.

        Returns:
            {
                "student_id": int | None,
                "similarity": float,
                "decision": "match" | "low_confidence" | "unknown",
                "all_similarities": [(student_id, similarity), ...] (top 5),
            }
        """
        if threshold is None:
            threshold = settings.RECOGNITION_THRESHOLD

        query_emb = get_embedding(frame)
        if query_emb is None:
            return {
                "student_id": None,
                "similarity": 0.0,
                "decision": "unknown",
                "all_similarities": [],
                "reject_reason": "No face detected in frame",
            }

        # Refresh cache from DB if dirty
        _refresh_cache_if_needed(self.embedding_repo)

        with _cache_lock:
            cache_snapshot = dict(_emb_cache)  # shallow copy under lock

        if not cache_snapshot:
            return {
                "student_id": None,
                "similarity": 0.0,
                "decision": "unknown",
                "all_similarities": [],
                "reject_reason": "No enrolled embeddings in database",
            }

        student_best = _faiss_search(query_emb, cache_snapshot)

        if not student_best:
            return {
                "student_id": None,
                "similarity": 0.0,
                "decision": "unknown",
                "all_similarities": [],
                "reject_reason": "Embedding dimension mismatch",
            }

        sorted_sims = sorted(student_best.items(), key=lambda x: x[1], reverse=True)
        best_id, best_sim = sorted_sims[0]

        if best_sim >= threshold:
            decision = "match"
        elif best_sim >= threshold * 0.7:
            decision = "low_confidence"
        else:
            decision = "unknown"

        return {
            "student_id": best_id if decision != "unknown" else None,
            "similarity": round(best_sim, 6),
            "decision": decision,
            "all_similarities": [(sid, round(s, 6)) for sid, s in sorted_sims[:5]],
        }

    # ── Threshold sweep (Milestone 3) ─────────────────────────────────────────

    def sweep_threshold(
        self,
        validation_frames: List[Tuple[np.ndarray, int]],
        candidate_thresholds: Optional[List[float]] = None,
        experiment_id: Optional[int] = None,
    ) -> Tuple[float, dict]:
        """Sweep candidate thresholds against validation set.

        Selects the operating point where |FAR - FRR| is minimised (equal-error
        rate approximation).  Results are optionally persisted to experiment_results.

        Args:
            validation_frames: List of (frame, true_student_id) pairs.
                               true_student_id=None means the face is not enrolled
                               (genuine impostors for FAR measurement).
            candidate_thresholds: List of floats to sweep.  Defaults to
                                  0.30, 0.35, …, 0.70.
            experiment_id: If provided, persist per-threshold metrics to DB.

        Returns:
            (best_threshold, {threshold: {accuracy, precision, recall, f1, far, frr, n}})
        """
        if candidate_thresholds is None:
            candidate_thresholds = [round(0.30 + i * 0.05, 2) for i in range(9)]

        n = len(validation_frames)
        results: dict = {}

        for thr in candidate_thresholds:
            tp = fp = fn = tn = 0
            for frame, true_id in validation_frames:
                r = self.identify(frame, threshold=thr)
                pred_id = r["student_id"]
                decision = r["decision"]
                if true_id is None:
                    # Impostor frame
                    if decision == "match":
                        fp += 1  # false alarm — accepted an unknown as someone
                    else:
                        tn += 1
                else:
                    # Genuine frame
                    if decision == "match" and pred_id == true_id:
                        tp += 1
                    elif decision == "match" and pred_id != true_id:
                        fp += 1  # wrong identity
                    else:
                        fn += 1  # false rejection

            total_positives = tp + fn
            total_negatives = fp + tn
            results[thr] = {
                "accuracy": round((tp + tn) / max(n, 1), 6),
                "precision": round(tp / max(tp + fp, 1), 6),
                "recall": round(tp / max(total_positives, 1), 6),
                "f1": round(2 * tp / max(2 * tp + fp + fn, 1), 6),
                "far": round(fp / max(total_negatives + fp, 1), 6),
                "frr": round(fn / max(total_positives, 1), 6),
                "n": n,
                "tp": tp, "fp": fp, "fn": fn, "tn": tn,
            }

        # Select threshold that minimises |FAR - FRR|
        best_thr = min(
            candidate_thresholds,
            key=lambda t: abs(results[t]["far"] - results[t]["frr"]),
        )

        # Persist to experiment_results if an experiment_id is provided
        if experiment_id:
            try:
                repo = ExperimentResultRepository(self.db)
                for thr, res in results.items():
                    for m in ("accuracy", "precision", "recall", "f1", "far", "frr"):
                        ci_lo, ci_hi = wilson_ci(
                            int(res[m] * n), n
                        ) if m in ("accuracy", "far", "frr") else (None, None)
                        repo.create(
                            experiment_id=experiment_id,
                            metric_name=f"t_{thr:.2f}_{m}",
                            value=res[m],
                            sample_size=n,
                            condition=f"threshold={thr:.2f}",
                            ci_lower=ci_lo,
                            ci_upper=ci_hi,
                        )
            except Exception as e:
                logger.warning(f"Could not persist sweep results: {e}")

        logger.info(f"Threshold sweep complete: selected={best_thr:.2f} (n={n})")
        return best_thr, results
