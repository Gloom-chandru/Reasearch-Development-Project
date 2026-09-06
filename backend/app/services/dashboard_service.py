"""Dashboard service — aggregated statistics for the admin portal.

Moved from dashboard.py route handler into the service layer to comply
with the API → Service → Repository → DB architecture.

All queries run in a single DB session to minimise round-trips.
"""

from __future__ import annotations

import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord
from app.models.experiment import Experiment
from app.models.notice import Notice
from app.models.session import AttendanceSession
from app.models.student import Student
from app.utils.logging import logger


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_stats(self) -> dict:
        """Return aggregated dashboard statistics.

        Uses GROUP BY queries + a single batch fetch for per-session
        attendance counts — no N+1 queries.
        """
        # ── Session counts by status ──────────────────────────────────
        session_counts = (
            self.db.query(AttendanceSession.status, func.count(AttendanceSession.id))
            .group_by(AttendanceSession.status)
            .all()
        )
        sessions_by_status = {
            (s.value if hasattr(s, "value") else str(s)): c
            for s, c in session_counts
        }
        total_sessions = sum(sessions_by_status.values())

        # ── All-time attendance counts by status ──────────────────────
        att_counts = (
            self.db.query(AttendanceRecord.status, func.count(AttendanceRecord.id))
            .group_by(AttendanceRecord.status)
            .all()
        )
        att_by_status = {
            (s.value if hasattr(s, "value") else str(s)): c
            for s, c in att_counts
        }

        # ── Student enrollment summary ────────────────────────────────
        total_students = (
            self.db.query(func.count(Student.id))
            .filter(Student.is_active == True)
            .scalar() or 0
        )
        enrolled_students = (
            self.db.query(func.count(Student.id))
            .filter(Student.is_active == True, Student.enrollment_count > 0)
            .scalar() or 0
        )

        # ── Active notices ────────────────────────────────────────────
        now = datetime.datetime.utcnow()
        active_notices = (
            self.db.query(func.count(Notice.id))
            .filter(
                Notice.is_active == True,
                Notice.valid_from <= now,
                (Notice.valid_until >= now) | (Notice.valid_until.is_(None)),
            )
            .scalar() or 0
        )

        # ── Experiment count ──────────────────────────────────────────
        total_experiments = (
            self.db.query(func.count(Experiment.id)).scalar() or 0
        )

        # ── Recent 10 sessions ────────────────────────────────────────
        recent_sessions_raw = (
            self.db.query(AttendanceSession)
            .order_by(AttendanceSession.scheduled_start.desc())
            .limit(10)
            .all()
        )

        # Batch fetch attendance counts for those sessions (avoids N+1)
        session_ids = [s.id for s in recent_sessions_raw]
        session_att: dict = {}
        if session_ids:
            batch = (
                self.db.query(
                    AttendanceRecord.session_id,
                    AttendanceRecord.status,
                    func.count(AttendanceRecord.id),
                )
                .filter(AttendanceRecord.session_id.in_(session_ids))
                .group_by(AttendanceRecord.session_id, AttendanceRecord.status)
                .all()
            )
            for sid, status, cnt in batch:
                sv = status.value if hasattr(status, "value") else str(status)
                session_att.setdefault(sid, {})[sv] = cnt

        recent_sessions = []
        for s in recent_sessions_raw:
            att = session_att.get(s.id, {})
            recent_sessions.append({
                "id": s.id,
                "title": s.title,
                "status": s.status.value if hasattr(s.status, "value") else str(s.status),
                "scheduled_start": s.scheduled_start.isoformat(),
                "scheduled_end": s.scheduled_end.isoformat(),
                "classroom_id": s.classroom_id,
                "subject_id": s.subject_id,
                "present": att.get("present", 0),
                "late": att.get("late", 0),
                "absent": att.get("absent-unmarked", 0),
                "total_records": sum(att.values()),
            })

        return {
            "total_sessions": total_sessions,
            "sessions_by_status": sessions_by_status,
            "total_students": total_students,
            "enrolled_students": enrolled_students,
            "unenrolled_students": total_students - enrolled_students,
            "attendance_all_time": {
                "present": att_by_status.get("present", 0),
                "late":    att_by_status.get("late", 0),
                "absent":  att_by_status.get("absent-unmarked", 0),
                "manual":  att_by_status.get("manual", 0),
            },
            "active_notices":    active_notices,
            "total_experiments": total_experiments,
            "recent_sessions":   recent_sessions,
        }
