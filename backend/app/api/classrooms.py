"""Classroom API routes — classrooms and classroom enrollment management."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user, require_role
from app.schemas.classroom import ClassroomCreate, ClassroomResponse, ClassroomListResponse
from app.services.classroom_service import ClassroomService
from app.models.user import User

router = APIRouter(prefix="/api/classrooms", tags=["classrooms"])


# ── Classroom CRUD ────────────────────────────────────────────────────────────

@router.post("", response_model=ClassroomResponse)
def create_classroom(
    data: ClassroomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    service = ClassroomService(db)
    return service.create_classroom(data=data.model_dump(), user_id=current_user.id)


@router.get("", response_model=ClassroomListResponse)
def list_classrooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ClassroomService(db)
    classrooms = service.list_classrooms()
    return {"total": len(classrooms), "classrooms": classrooms}


@router.get("/{classroom_id}", response_model=ClassroomResponse)
def get_classroom(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ClassroomService(db)
    return service.get_classroom(classroom_id)


@router.put("/{classroom_id}", response_model=ClassroomResponse)
def update_classroom(
    classroom_id: int,
    data: ClassroomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod")),
):
    service = ClassroomService(db)
    return service.update_classroom(classroom_id=classroom_id, data=data.model_dump(), user_id=current_user.id)


@router.delete("/{classroom_id}")
def delete_classroom(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    service = ClassroomService(db)
    service.delete_classroom(classroom_id=classroom_id, user_id=current_user.id)
    return {"message": "Classroom deleted"}


# ── Classroom Enrollment ──────────────────────────────────────────────────────

class EnrollStudentsRequest(BaseModel):
    student_ids: List[int] = Field(..., min_length=1)
    subject_id: Optional[int] = None


class UnenrollStudentRequest(BaseModel):
    student_id: int
    subject_id: Optional[int] = None


@router.post("/{classroom_id}/enrollments")
def enroll_students(
    classroom_id: int,
    payload: EnrollStudentsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator", "faculty")),
):
    """Enroll one or more students into a classroom (optionally for a specific subject).

    Duplicate enrollments are silently skipped.
    """
    service = ClassroomService(db)
    return service.enroll_students(
        classroom_id=classroom_id,
        student_ids=payload.student_ids,
        subject_id=payload.subject_id,
        user_id=current_user.id,
    )


@router.get("/{classroom_id}/enrollments")
def list_enrollments(
    classroom_id: int,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all students enrolled in a classroom."""
    service = ClassroomService(db)
    results = service.list_enrollments(classroom_id=classroom_id, subject_id=subject_id)
    return {"total": len(results), "classroom_id": classroom_id, "enrollments": results}


@router.delete("/{classroom_id}/enrollments/{enrollment_id}")
def unenroll_student(
    classroom_id: int,
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator", "faculty")),
):
    """Remove a student's enrollment from a classroom."""
    service = ClassroomService(db)
    return service.unenroll_student(
        classroom_id=classroom_id,
        enrollment_id=enrollment_id,
        user_id=current_user.id,
    )
