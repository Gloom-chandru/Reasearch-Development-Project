"""Reporting API routes — downloadable Excel reports."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.services.reporting_service import ExcelReportService

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/session/{session_id}")
def download_session_report(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download an Excel attendance report for a session."""
    service = ExcelReportService(db)
    excel_bytes = service.generate_session_report(session_id)
    if excel_bytes is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return StreamingResponse(
        iter([excel_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=attendance_session_{session_id}.xlsx"},
    )


@router.get("/student/{student_id}")
def download_student_report(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download an Excel attendance report for a student."""
    service = ExcelReportService(db)
    excel_bytes = service.generate_student_report(student_id)
    if excel_bytes is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return StreamingResponse(
        iter([excel_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=attendance_student_{student_id}.xlsx"},
    )