"""Experiment API routes.

Covers:
- CRUD for experiments / experiment_results
- POST /experiments/threshold-sweep  — run a threshold sweep against
  the validation frames stored in face_embeddings and update the
  active AttendanceConfiguration for a classroom.
"""

from __future__ import annotations

import base64
from typing import List, Optional

import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user, require_role
from app.schemas.experiment import (
    ExperimentCreate,
    ExperimentResponse,
    ExperimentResultCreate,
    ExperimentResultResponse,
)
from app.repositories.repository_logging import ExperimentRepository, ExperimentResultRepository
from app.repositories.repository_sessions import AttendanceConfigurationRepository
from app.models.user import User
from app.utils.logging import logger

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("", response_model=ExperimentResponse)
def create_experiment(
    data: ExperimentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod")),
):
    repo = ExperimentRepository(db)
    return repo.create(**data.model_dump())


@router.get("", response_model=list[ExperimentResponse])
def list_experiments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExperimentRepository(db).list()


@router.get("/{experiment_id}", response_model=ExperimentResponse)
def get_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exp = ExperimentRepository(db).get(experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp


@router.get("/{experiment_id}/results", response_model=list[ExperimentResultResponse])
def get_experiment_results(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ExperimentResultRepository(db).get_by_experiment(experiment_id)


@router.post("/results", response_model=ExperimentResultResponse)
def create_experiment_result(
    data: ExperimentResultCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod")),
):
    return ExperimentResultRepository(db).create(**data.model_dump())


# ── Threshold sweep ───────────────────────────────────────────────────────────

class ThresholdSweepFrame(BaseModel):
    image_data: str = Field(..., description="Base64-encoded JPEG frame")
    true_student_id: Optional[int] = Field(
        None,
        description="Ground-truth student ID, or null for impostor (unenrolled) frames",
    )


class ThresholdSweepRequest(BaseModel):
    validation_frames: List[ThresholdSweepFrame] = Field(
        ...,
        min_length=10,
        description="Validation frames with ground-truth labels. Min 10 required.",
    )
    candidate_thresholds: Optional[List[float]] = Field(
        None,
        description="Thresholds to sweep (default 0.30–0.70 step 0.05)",
    )
    classroom_id: Optional[int] = Field(
        None,
        description="If provided, update the active AttendanceConfiguration for this classroom",
    )
    update_config: bool = Field(
        False,
        description="If true, write the selected threshold to the classroom config",
    )


class ThresholdSweepResponse(BaseModel):
    selected_threshold: float
    experiment_id: int
    n_frames: int
    config_updated: bool
    results_summary: dict


@router.post("/threshold-sweep", response_model=ThresholdSweepResponse)
def run_threshold_sweep(
    payload: ThresholdSweepRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod")),
):
    """Run a threshold sweep against labelled validation frames.

    Selects the operating threshold that minimises |FAR - FRR| (equal-error
    rate approximation).  Persists all per-threshold metrics to experiment_results.

    Optionally writes the selected threshold back to the classroom's
    AttendanceConfiguration so the live pipeline picks it up immediately.

    This is Milestone 3's evidence-based threshold selection — use validation
    frames only, never test frames.
    """
    from app.services.recognition_service import RecognitionService
    from app.repositories.repository_logging import ExperimentRepository

    # Decode frames
    frames: List[tuple] = []
    for item in payload.validation_frames:
        try:
            img_bytes = base64.b64decode(item.image_data)
            arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if frame is not None:
                frames.append((frame, item.true_student_id))
        except Exception as e:
            logger.warning(f"Threshold sweep: skipping undecodable frame: {e}")

    if len(frames) < 5:
        raise HTTPException(
            status_code=400,
            detail=f"Only {len(frames)} valid frames decoded (need ≥5). "
                   "Check base64 encoding of images.",
        )

    # Create an experiment record for this sweep
    exp_repo = ExperimentRepository(db)
    exp = exp_repo.create(
        name="Threshold Sweep — Validation Set",
        description=f"Evidence-based threshold selection. n={len(frames)} validation frames.",
        experiment_type="recognition",
        model_version="insightface_buffalo_l",
        threshold=None,
        participant_count=len({tid for _, tid in frames if tid is not None}),
        notes="Milestone 3 — threshold selected from validation data, not test data.",
    )

    # Run sweep
    rec_service = RecognitionService(db)
    best_thr, results = rec_service.sweep_threshold(
        validation_frames=frames,
        candidate_thresholds=payload.candidate_thresholds,
        experiment_id=exp.id,
    )

    # Update experiment threshold field
    exp.threshold = best_thr
    db.commit()

    # Optionally write selected threshold to classroom config
    config_updated = False
    if payload.update_config and payload.classroom_id is not None:
        cfg_repo = AttendanceConfigurationRepository(db)
        existing_cfg = cfg_repo.get_for_classroom(payload.classroom_id)
        if existing_cfg:
            existing_cfg.recognition_threshold = best_thr
            db.commit()
            config_updated = True
            logger.info(
                f"Threshold updated for classroom={payload.classroom_id}: "
                f"{best_thr:.2f} (from sweep on n={len(frames)} validation frames)"
            )
        else:
            # Create a new config row for this classroom
            cfg_repo.create(
                classroom_id=payload.classroom_id,
                recognition_threshold=best_thr,
            )
            config_updated = True
            logger.info(
                f"Created AttendanceConfiguration for classroom={payload.classroom_id} "
                f"with threshold={best_thr:.2f}"
            )

    # Build a compact summary (best threshold metrics only)
    best_summary = results.get(best_thr, {})

    return ThresholdSweepResponse(
        selected_threshold=best_thr,
        experiment_id=exp.id,
        n_frames=len(frames),
        config_updated=config_updated,
        results_summary={
            "best_threshold": best_thr,
            "accuracy": best_summary.get("accuracy"),
            "far": best_summary.get("far"),
            "frr": best_summary.get("frr"),
            "f1": best_summary.get("f1"),
            "note": (
                f"n={len(frames)} validation frames. "
                f"Wide CIs expected for small n — treat as indicative."
                if len(frames) < 30
                else f"n={len(frames)} validation frames."
            ),
        },
    )
