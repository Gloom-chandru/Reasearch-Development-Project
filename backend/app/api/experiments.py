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
from app.services.experiment_service import ExperimentService
from app.services.research_assistant import ResearchAssistantService
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
    service = ExperimentService(db)
    return service.list_experiments()


@router.get("/{experiment_id}", response_model=ExperimentResponse)
def get_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ExperimentService(db)
    return service.get_experiment(experiment_id)


@router.get("/{experiment_id}/results", response_model=list[ExperimentResultResponse])
def get_experiment_results(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ExperimentService(db)
    return service.get_experiment_results(experiment_id)


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
        min_length=5,
        description="Validation frames with ground-truth labels. Min 5 required.",
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
    rate approximation). Persists all per-threshold metrics to experiment_results.
    """
    service = ExperimentService(db)
    return service.run_threshold_sweep(
        raw_frames=[f.model_dump() for f in payload.validation_frames],
        candidate_thresholds=payload.candidate_thresholds,
        classroom_id=payload.classroom_id,
        update_config=payload.update_config,
    )


# ── Research Assistant (RAG) ──────────────────────────────────────────────────

class AssistantQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)


class AssistantQueryResponse(BaseModel):
    query: str
    answer: str
    citations: List[dict]
    relevant_experiments_count: int


@router.post("/assistant/query", response_model=AssistantQueryResponse)
def query_research_assistant(
    payload: AssistantQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Query empirical research experiments and attendance statistics using natural language.

    Strictly grounded in database rows from experiment_results. All proportions report
    sample size (n) and 95% Wilson confidence intervals.
    """
    assistant = ResearchAssistantService(db)
    return assistant.query_research_data(payload.query)
