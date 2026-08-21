"""Experiment models — persist every experiment run with full metadata."""

from __future__ import annotations

import datetime
from typing import Optional

from sqlalchemy import (
    String, DateTime, Integer, Float, Text, Boolean, ForeignKey,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Experiment(Base):
    """One row per experiment configuration (see §10 of master prompt)."""

    __tablename__ = "experiments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    experiment_type: Mapped[str] = mapped_column(
        String(40), nullable=False, index=True
    )  # recognition, lighting, distance, angle, multi_face, latency, liveness, ablation, baseline
    configuration: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # JSON string of parameters
    model_version: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    threshold: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dataset_label: Mapped[Optional[str]] = mapped_column(
        String(80), nullable=True
    )  # e.g. "enrollment", "validation", "test"
    participant_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def __repr__(self) -> str:
        return f"<Experiment {self.id}: {self.name} ({self.experiment_type})>"


class ExperimentResult(Base):
    """One row per metric per experiment configuration.

    Results are linked to their parent Experiment.
    """

    __tablename__ = "experiment_results"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    experiment_id: Mapped[int] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    metric_name: Mapped[str] = mapped_column(
        String(60), nullable=False
    )  # e.g. accuracy, precision, recall, f1, far, frr, latency_mean, latency_p50, latency_p95
    value: Mapped[float] = mapped_column(Float, nullable=False)
    ci_lower: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ci_upper: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sample_size: Mapped[int] = mapped_column(Integer, nullable=False)
    condition: Mapped[Optional[str]] = mapped_column(
        String(80), nullable=True
    )  # e.g. "good_lighting", "moderate_lighting", "1m", "frontal"
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def __repr__(self) -> str:
        return (
            f"<ExperimentResult {self.id}: {self.metric_name}={self.value:.4f} "
            f"(n={self.sample_size})>"
        )