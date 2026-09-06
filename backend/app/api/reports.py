"""Reporting API routes — downloadable Excel reports.

Authentication note
-------------------
Browser download links (e.g. <a href="/api/reports/session/1?token=xxx"> ) cannot
send an Authorization header, so these endpoints accept the JWT either via:
  1. Authorization: Bearer <token>  (normal API calls)
  2. ?token=<token>  (browser download link fallback)

The token is validated identically in both cases.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.security import decode_access_token
from app.models.user import User
from app.services.reporting_service import ExcelReportService
from app.utils.logging import logger

router = APIRouter(prefix="/api/reports", tags=["reports"])

_bearer = HTTPBearer(auto_error=False)


def _get_report_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    token: Optional[str] = Query(None, description="JWT token for browser download links"),
    db: Session = Depends(get_db),
) -> User:
    """Accept token from Authorization header OR ?token= query param."""
    raw_token = None
    if credentials and credentials.credentials:
        raw_token = credentials.credentials
    elif token:
        raw_token = token
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required — provide Bearer token or ?token= query param",
        )

    payload = decode_access_token(raw_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


# ── Session report ─────────────────────────────────────────────────────────────

@router.get("/session/{session_id}")
def download_session_report(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_report_user),
):
    """Download an Excel attendance report for a session.

    Columns: register_number, full_name, department, section, status,
    recognition_decision, similarity_score, entry_time, is_corrected.
    Also includes a Summary sheet.
    """
    service = ExcelReportService(db)
    excel_bytes = service.generate_session_report(session_id)
    if excel_bytes is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )
    logger.info(
        f"Session report downloaded: session_id={session_id} by user={current_user.id}"
    )
    return StreamingResponse(
        iter([excel_bytes]),
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": (
                f"attachment; filename=attendance_session_{session_id}.xlsx"
            )
        },
    )


# ── Student report ─────────────────────────────────────────────────────────────

@router.get("/student/{student_id}")
def download_student_report(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_report_user),
):
    """Download an Excel attendance report for a student across all sessions."""
    service = ExcelReportService(db)
    excel_bytes = service.generate_student_report(student_id)
    if excel_bytes is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student not found"
        )
    logger.info(
        f"Student report downloaded: student_id={student_id} by user={current_user.id}"
    )
    return StreamingResponse(
        iter([excel_bytes]),
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": (
                f"attachment; filename=attendance_student_{student_id}.xlsx"
            )
        },
    )
