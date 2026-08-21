"""Subject API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user, require_role
from app.schemas.session import SessionCreate, SessionResponse, SessionListResponse, SessionUpdate
from app.services.session_service import SessionService
from app.schemas.attendance import AttendanceListResponse, AttendanceCorrectionRequest
from app.services.attendance_service import AttendanceService
from app.models.user import User
from app.repositories.repository_sessions import SubjectRepository
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

class SubjectCreate(BaseModel):
    name: str = Field(..., max_length=120)
    code: str = Field(..., max_length=20)
    department: str = Field(..., max_length=60)


@router.post("/subjects")
def create_subject(
    data: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    repo = SubjectRepository(db)
    subject = repo.create(**data.model_dump())
    return subject


@router.get("/subjects")
def list_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = SubjectRepository(db)
    subjects = repo.list()
    return {"total": len(subjects), "subjects": subjects}


@router.post("", response_model=SessionResponse)
def create_session(
    data: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator", "faculty")),
):
    service = SessionService(db)
    return service.create_session(data)


@router.get("", response_model=SessionListResponse)
def list_sessions(
    skip: int = 0,
    limit: int = 100,
    classroom_id: int = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SessionService(db)
    filters = {}
    if classroom_id:
        filters["classroom_id"] = classroom_id
    if status:
        filters["status"] = status
    return service.list_sessions(skip=skip, limit=limit, **filters)


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SessionService(db)
    return service.get_session(session_id)


@router.put("/{session_id}", response_model=SessionResponse)
def update_session(
    session_id: int,
    data: SessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    service = SessionService(db)
    return service.update_session(session_id, data)


@router.post("/{session_id}/activate", response_model=SessionResponse)
def activate_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator", "faculty")),
):
    service = SessionService(db)
    return service.activate_session(session_id)


@router.post("/{session_id}/complete", response_model=SessionResponse)
def complete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator", "faculty")),
):
    service = SessionService(db)
    return service.complete_session(session_id)


@router.get("/{session_id}/attendance", response_model=AttendanceListResponse)
def get_session_attendance(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AttendanceService(db)
    return service.get_session_records(session_id)


@router.post("/attendance/correct")
def correct_attendance(
    correction: AttendanceCorrectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator", "faculty")),
):
    service = AttendanceService(db)
    return service.correct_attendance(correction, current_user.id)