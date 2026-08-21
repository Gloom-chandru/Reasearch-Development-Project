"""Repository implementations — Part 3: Logging, Events, Experiments."""

from app.repositories.base import BaseRepository
from app.models.audit import AuditLog
from app.models.system_event import SystemEvent
from app.models.experiment import Experiment, ExperimentResult


class AuditLogRepository(BaseRepository[AuditLog]):
    def __init__(self, db):
        super().__init__(AuditLog, db)


class SystemEventRepository(BaseRepository[SystemEvent]):
    def __init__(self, db):
        super().__init__(SystemEvent, db)


class ExperimentRepository(BaseRepository[Experiment]):
    def __init__(self, db):
        super().__init__(Experiment, db)


class ExperimentResultRepository(BaseRepository[ExperimentResult]):
    def __init__(self, db):
        super().__init__(ExperimentResult, db)

    def get_by_experiment(self, experiment_id: int):
        return (
            self.db.query(ExperimentResult)
            .filter(ExperimentResult.experiment_id == experiment_id)
            .all()
        )