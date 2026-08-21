"""Experiment API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends
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
from app.models.user import User

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


@router.post("", response_model=ExperimentResponse)
def create_experiment(
    data: ExperimentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod")),
):
    repo = ExperimentRepository(db)
    exp = repo.create(**data.model_dump())
    return exp


@router.get("", response_model=list[ExperimentResponse])
def list_experiments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = ExperimentRepository(db)
    return repo.list()


@router.get("/{experiment_id}", response_model=ExperimentResponse)
def get_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = ExperimentRepository(db)
    exp = repo.get(experiment_id)
    if not exp:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp


@router.get("/{experiment_id}/results", response_model=list[ExperimentResultResponse])
def get_experiment_results(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = ExperimentResultRepository(db)
    return repo.get_by_experiment(experiment_id)


@router.post("/results", response_model=ExperimentResultResponse)
def create_experiment_result(
    data: ExperimentResultCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod")),
):
    repo = ExperimentResultRepository(db)
    result = repo.create(**data.model_dump())
    return result