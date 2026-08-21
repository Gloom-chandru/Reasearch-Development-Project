"""Student API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user, require_role
from app.schemas.student import StudentCreate, StudentResponse, StudentListResponse, StudentUpdate
from app.services.student_service import StudentService
from app.models.user import User

router = APIRouter(prefix="/api/students", tags=["students"])


@router.post("", response_model=StudentResponse)
def create_student(
    data: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    service = StudentService(db)
    return service.create_student(data)


@router.get("", response_model=StudentListResponse)
def list_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    department: str = Query(None),
    section: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = StudentService(db)
    filters = {}
    if department:
        filters["department"] = department
    if section:
        filters["section"] = section
    return service.list_students(skip=skip, limit=limit, **filters)


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = StudentService(db)
    return service.get_student(student_id)


@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int,
    data: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    service = StudentService(db)
    return service.update_student(student_id, data)


@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    service = StudentService(db)
    return service.delete_student(student_id)