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
from app.models.audit import AuditLog
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

        # ── Today's attendance counts ─────────────────────────────────
        today_date = datetime.date.today()
        today_start = datetime.datetime.combine(today_date, datetime.time.min)
        today_end = datetime.datetime.combine(today_date, datetime.time.max)

        today_rows = (
            self.db.query(AttendanceRecord.status, func.count(AttendanceRecord.id))
            .filter(AttendanceRecord.captured_at >= today_start, AttendanceRecord.captured_at <= today_end)
            .group_by(AttendanceRecord.status)
            .all()
        )
        today_map = {
            (s.value if hasattr(s, "value") else str(s)): c
            for s, c in today_rows
        }
        today_present = today_map.get("present", 0) + today_map.get("manual", 0)
        today_late = today_map.get("late", 0)
        today_absent = today_map.get("absent-unmarked", 0)
        today_total = today_present + today_late + today_absent

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

        # ── Attendance chart (daily distribution from recent attendance records) ──
        chart_rows = (
            self.db.query(
                func.date(AttendanceRecord.captured_at).label("day"),
                AttendanceRecord.status,
                func.count(AttendanceRecord.id).label("count"),
            )
            .group_by(func.date(AttendanceRecord.captured_at), AttendanceRecord.status)
            .order_by(func.date(AttendanceRecord.captured_at).desc())
            .limit(28)
            .all()
        )

        daily_att: dict = {}
        for day_val, status, count in chart_rows:
            day_str = str(day_val)
            if day_str not in daily_att:
                daily_att[day_str] = {"present": 0, "late": 0, "absent": 0}
            st_val = status.value if hasattr(status, "value") else str(status)
            if st_val in ("present", "manual"):
                daily_att[day_str]["present"] += count
            elif st_val == "late":
                daily_att[day_str]["late"] += count
            elif st_val == "absent-unmarked":
                daily_att[day_str]["absent"] += count

        attendance_chart = []
        for d in sorted(daily_att.keys()):
            try:
                dt = datetime.date.fromisoformat(d)
                day_label = dt.strftime("%a")
                date_label = dt.strftime("%b %d")
            except Exception:
                day_label = d
                date_label = d
            attendance_chart.append({
                "date": d,
                "day": day_label,
                "label": date_label,
                "present": daily_att[d]["present"] + daily_att[d]["late"],
                "absent": daily_att[d]["absent"],
            })

        # ── Recent activity (Audit logs) ──────────────────────────────
        recent_logs = (
            self.db.query(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(6)
            .all()
        )
        recent_activity = [
            {
                "id": log.id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "details": log.details or f"{log.action.replace('_', ' ').capitalize()} {log.entity_type}",
                "created_at": log.created_at.isoformat(),
            }
            for log in recent_logs
        ]

        return {
            "total_sessions": total_sessions,
            "sessions_by_status": sessions_by_status,
            "total_students": total_students,
            "enrolled_students": enrolled_students,
            "unenrolled_students": total_students - enrolled_students,
            "today_stats": {
                "present": today_present,
                "late": today_late,
                "absent": today_absent,
                "total": today_total,
            },
            "attendance_all_time": {
                "present": att_by_status.get("present", 0),
                "late":    att_by_status.get("late", 0),
                "absent":  att_by_status.get("absent-unmarked", 0),
                "manual":  att_by_status.get("manual", 0),
            },
            "active_notices":    active_notices,
            "total_experiments": total_experiments,
            "recent_sessions":   recent_sessions,
            "attendance_chart":  attendance_chart,
            "recent_activity":   recent_activity,
        }
