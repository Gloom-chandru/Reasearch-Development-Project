"""Dashboard API — aggregated stats in a single request.

Replaces the N+1 pattern in DashboardPage where each session required
a separate attendance fetch.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.models.session import AttendanceSession
from app.models.attendance import AttendanceRecord
from app.models.student import Student
from app.models.notice import Notice
from app.models.experiment import Experiment
from app.utils.logging import logger
import datetime

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return aggregated dashboard statistics in a single DB round-trip."""

    # Session counts by status
    session_counts = (
        db.query(AttendanceSession.status, func.count(AttendanceSession.id))
        .group_by(AttendanceSession.status)
        .all()
    )
    sessions_by_status = {
        (s.value if hasattr(s, "value") else s): c for s, c in session_counts
    }
    total_sessions = sum(sessions_by_status.values())

    # Attendance record counts by status (all time)
    att_counts = (
        db.query(AttendanceRecord.status, func.count(AttendanceRecord.id))
        .group_by(AttendanceRecord.status)
        .all()
    )
    att_by_status = {
        (s.value if hasattr(s, "value") else s): c for s, c in att_counts
    }

    # Total enrolled students
    total_students = db.query(func.count(Student.id)).filter(Student.is_active == True).scalar() or 0
    enrolled_students = (
        db.query(func.count(Student.id))
        .filter(Student.is_active == True, Student.enrollment_count > 0)
        .scalar() or 0
    )

    # Active notices
    now = datetime.datetime.utcnow()
    active_notices = (
        db.query(func.count(Notice.id))
        .filter(
            Notice.is_active == True,
            Notice.valid_from <= now,
            (Notice.valid_until >= now) | (Notice.valid_until.is_(None)),
        )
        .scalar() or 0
    )

    # Experiments run
    total_experiments = db.query(func.count(Experiment.id)).scalar() or 0

    # Recent 10 sessions with quick attendance summary
    recent_sessions_raw = (
        db.query(AttendanceSession)
        .order_by(AttendanceSession.scheduled_start.desc())
        .limit(10)
        .all()
    )

    # Batch fetch attendance counts for those sessions
    session_ids = [s.id for s in recent_sessions_raw]
    if session_ids:
        batch_counts = (
            db.query(
                AttendanceRecord.session_id,
                AttendanceRecord.status,
                func.count(AttendanceRecord.id),
            )
            .filter(AttendanceRecord.session_id.in_(session_ids))
            .group_by(AttendanceRecord.session_id, AttendanceRecord.status)
            .all()
        )
        # Organise into {session_id: {status: count}}
        session_att: dict = {}
        for sid, status, cnt in batch_counts:
            sv = status.value if hasattr(status, "value") else status
            if sid not in session_att:
                session_att[sid] = {}
            session_att[sid][sv] = cnt
    else:
        session_att = {}

    recent_sessions = []
    for s in recent_sessions_raw:
        att = session_att.get(s.id, {})
        recent_sessions.append({
            "id": s.id,
            "title": s.title,
            "status": s.status.value if hasattr(s.status, "value") else s.status,
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
            "late": att_by_status.get("late", 0),
            "absent": att_by_status.get("absent-unmarked", 0),
            "manual": att_by_status.get("manual", 0),
        },
        "active_notices": active_notices,
        "total_experiments": total_experiments,
        "recent_sessions": recent_sessions,
    }
