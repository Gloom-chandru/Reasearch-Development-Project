"""Repository implementations — Part 2: Sessions, Attendance, Config."""

from app.repositories.base import BaseRepository
from app.models.classroom import Classroom
from app.models.subject import Subject
from app.models.session import AttendanceSession
from app.models.attendance import AttendanceRecord
from app.models.correction import Correction
from app.models.notice import Notice
from app.models.config import AttendanceConfiguration


class ClassroomRepository(BaseRepository[Classroom]):
    def __init__(self, db):
        super().__init__(Classroom, db)

    def get_by_code(self, code: str):
        return self.db.query(Classroom).filter(Classroom.code == code).first()


class SubjectRepository(BaseRepository[Subject]):
    def __init__(self, db):
        super().__init__(Subject, db)

    def get_by_code(self, code: str):
        return self.db.query(Subject).filter(Subject.code == code).first()


class AttendanceSessionRepository(BaseRepository[AttendanceSession]):
    def __init__(self, db):
        super().__init__(AttendanceSession, db)

    def get_active_sessions(self):
        return (
            self.db.query(AttendanceSession)
            .filter(AttendanceSession.status == "active")
            .all()
        )

    def get_sessions_by_classroom(self, classroom_id: int):
        return (
            self.db.query(AttendanceSession)
            .filter(AttendanceSession.classroom_id == classroom_id)
            .order_by(AttendanceSession.scheduled_start.desc())
            .all()
        )


class AttendanceRecordRepository(BaseRepository[AttendanceRecord]):
    def __init__(self, db):
        super().__init__(AttendanceRecord, db)

    def get_by_student_and_session(self, student_id: int, session_id: int):
        return (
            self.db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.session_id == session_id,
            )
            .first()
        )

    def get_records_by_session(self, session_id: int):
        return (
            self.db.query(AttendanceRecord)
            .filter(AttendanceRecord.session_id == session_id)
            .all()
        )

    def get_stats_by_session(self, session_id: int):
        records = self.get_records_by_session(session_id)
        total = len(records)
        present = sum(1 for r in records if r.status == "present")
        late = sum(1 for r in records if r.status == "late")
        absent = sum(1 for r in records if r.status == "absent-unmarked")
        return {"total": total, "present": present, "late": late, "absent": absent}


class CorrectionRepository(BaseRepository[Correction]):
    def __init__(self, db):
        super().__init__(Correction, db)


class NoticeRepository(BaseRepository[Notice]):
    def __init__(self, db):
        super().__init__(Notice, db)

    def get_active_notices(self, classroom_id: int = None):
        from datetime import datetime
        q = self.db.query(Notice).filter(
            Notice.is_active == True,
            Notice.valid_from <= datetime.utcnow(),
            (Notice.valid_until >= datetime.utcnow()) | (Notice.valid_until.is_(None)),
        )
        if classroom_id:
            q = q.filter(
                (Notice.classroom_id == classroom_id)
                | (Notice.classroom_id.is_(None))
            )
        return q.order_by(Notice.priority.desc(), Notice.created_at.desc()).all()


class AttendanceConfigurationRepository(BaseRepository[AttendanceConfiguration]):
    def __init__(self, db):
        super().__init__(AttendanceConfiguration, db)

    def get_for_classroom(self, classroom_id: int):
        return (
            self.db.query(AttendanceConfiguration)
            .filter(
                AttendanceConfiguration.classroom_id == classroom_id,
                AttendanceConfiguration.is_active == True,
            )
            .first()
        )