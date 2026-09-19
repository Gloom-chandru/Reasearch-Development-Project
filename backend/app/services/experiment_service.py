"""Experiment service — business logic for experiment lifecycle and evidence-based threshold sweeps."""

from __future__ import annotations

import base64
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.experiment import Experiment
from app.repositories.repository_logging import ExperimentRepository, ExperimentResultRepository
from app.repositories.repository_sessions import AttendanceConfigurationRepository
from app.services.recognition_service import RecognitionService
from app.services.websocket_manager import manager
from app.utils.logging import logger


class ExperimentService:
    def __init__(self, db: Session):
        self.db = db
        self.exp_repo = ExperimentRepository(db)
        self.result_repo = ExperimentResultRepository(db)
        self.config_repo = AttendanceConfigurationRepository(db)
        self.rec_service = RecognitionService(db)

    def list_experiments(self) -> List[Experiment]:
        return self.exp_repo.list()

    def get_experiment(self, experiment_id: int) -> Experiment:
        exp = self.exp_repo.get(experiment_id)
        if not exp:
            raise HTTPException(status_code=404, detail="Experiment not found")
        return exp

    def get_experiment_results(self, experiment_id: int) -> list:
        return self.result_repo.get_by_experiment(experiment_id)

    def run_threshold_sweep(
        self,
        raw_frames: List[dict],
        candidate_thresholds: Optional[List[float]],
        classroom_id: Optional[int],
        update_config: bool,
    ) -> Dict:
        """Decode frames, run threshold sweep, persist to experiment_results, and update classroom config."""
        frames: List[Tuple[np.ndarray, Optional[int]]] = []
        for item in raw_frames:
            try:
                img_data = item.get("image_data", "")
                true_id = item.get("true_student_id")
                img_bytes = base64.b64decode(img_data)
                arr = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                if frame is not None:
                    frames.append((frame, true_id))
            except Exception as e:
                logger.warning(f"Threshold sweep: skipping undecodable frame: {e}")

        if len(frames) < 5:
            raise HTTPException(
                status_code=400,
                detail=f"Only {len(frames)} valid frames decoded (need ≥5). Check base64 encoding.",
            )

        # Create experiment metadata record
        exp = self.exp_repo.create(
            name="Threshold Sweep — Validation Set",
            description=f"Evidence-based threshold selection. n={len(frames)} validation frames.",
            experiment_type="recognition",
            model_version="insightface_buffalo_l",
            threshold=None,
            participant_count=len({tid for _, tid in frames if tid is not None}),
            notes="Milestone 3 — threshold selected from validation data, minimizing |FAR - FRR|.",
        )

        # Execute sweep
        best_thr, results = self.rec_service.sweep_threshold(
            validation_frames=frames,
            candidate_thresholds=candidate_thresholds,
            experiment_id=exp.id,
        )

        # Update experiment row with selected threshold
        exp.threshold = best_thr
        self.db.commit()

        # Update classroom configuration if requested
        config_updated = False
        if classroom_id is not None:
            cfg = self.config_repo.get_for_classroom(classroom_id)
            if cfg:
                if update_config:
                    cfg.recognition_threshold = best_thr
                cfg.threshold_validated = True
                self.db.commit()
                config_updated = update_config
            else:
                self.config_repo.create(
                    classroom_id=classroom_id,
                    recognition_threshold=best_thr if update_config else 0.40,
                    threshold_validated=True,
                )
                config_updated = update_config

        best_summary = results.get(best_thr, {})
        response_data = {
            "selected_threshold": best_thr,
            "experiment_id": exp.id,
            "n_frames": len(frames),
            "config_updated": config_updated,
            "results_summary": {
                "best_threshold": best_thr,
                "accuracy": best_summary.get("accuracy"),
                "far": best_summary.get("far"),
                "frr": best_summary.get("frr"),
                "f1": best_summary.get("f1"),
                "note": (
                    f"n={len(frames)} validation frames. Wide CIs expected for small n."
                    if len(frames) < 30
                    else f"n={len(frames)} validation frames."
                ),
            },
        }

        # Broadcast real-time update to WebSocket subscribers (Analytics page)
        try:
            import asyncio
            async def _push():
                await manager.broadcast_experiment_result({
                    "experiment_id": exp.id,
                    "experiment_type": "recognition",
                    "name": exp.name,
                    "selected_threshold": best_thr,
                    "n_frames": len(frames),
                    "summary": response_data["results_summary"],
                })
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(_push())
            except RuntimeError:
                asyncio.run(_push())
        except Exception as e:
            logger.debug(f"Experiment broadcast error: {e}")

        return response_data
