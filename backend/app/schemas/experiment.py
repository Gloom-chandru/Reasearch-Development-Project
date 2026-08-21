"""Experiment schemas."""

from __future__ import annotations

import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ExperimentCreate(BaseModel):
    name: str = Field(..., max_length=120)
    description: Optional[str] = None
    experiment_type: str = Field(..., max_length=40)
    configuration: Optional[str] = None  # JSON string
    model_version: Optional[str] = Field(None, max_length=40)
    threshold: Optional[float] = None
    dataset_label: Optional[str] = Field(None, max_length=80)
    participant_count: Optional[int] = None
    notes: Optional[str] = None


class ExperimentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    experiment_type: str
    configuration: Optional[str]
    model_version: Optional[str]
    threshold: Optional[float]
    dataset_label: Optional[str]
    participant_count: Optional[int]
    notes: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class ExperimentResultCreate(BaseModel):
    experiment_id: int
    metric_name: str = Field(..., max_length=60)
    value: float
    ci_lower: Optional[float] = None
    ci_upper: Optional[float] = None
    sample_size: int = Field(..., ge=0)
    condition: Optional[str] = Field(None, max_length=80)


class ExperimentResultResponse(BaseModel):
    id: int
    experiment_id: int
    metric_name: str
    value: float
    ci_lower: Optional[float]
    ci_upper: Optional[float]
    sample_size: int
    condition: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True