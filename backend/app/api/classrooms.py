"""Classroom API routes — classrooms and classroom enrollment management."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user, require_role
from app.schemas.classroom import ClassroomCreate, ClassroomResponse, ClassroomListResponse
from app.repositories.repository_sessions import ClassroomRepository
from app.repositories.repository_core import ClassroomEnrollmentRepository, StudentRepository
from app.repositories.repository_logging import AuditLogRepository
from app.models.user import User

router = APIRouter(prefix="/api/classrooms", tags=["classrooms"])


# ── Classroom CRUD ────────────────────────────────────────────────────────────

@router.post("", response_model=ClassroomResponse)
def create_classroom(
    data: ClassroomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    repo = ClassroomRepository(db)
    classroom = repo.create(**data.model_dump())
    AuditLogRepository(db).create(
        user_id=current_user.id, action="create", entity_type="classroom",
        entity_id=classroom.id, details=f"Created classroom '{classroom.name}'"
    )
    return classroom


@router.get("", response_model=ClassroomListResponse)
def list_classrooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = ClassroomRepository(db)
    classrooms = repo.list()
    return {"total": len(classrooms), "classrooms": classrooms}


@router.get("/{classroom_id}", response_model=ClassroomResponse)
def get_classroom(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = ClassroomRepository(db)
    classroom = repo.get(classroom_id)
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    return classroom


@router.put("/{classroom_id}", response_model=ClassroomResponse)
def update_classroom(
    classroom_id: int,
    data: ClassroomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod")),
):
    repo = ClassroomRepository(db)
    classroom = repo.update(classroom_id, **data.model_dump())
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    AuditLogRepository(db).create(
        user_id=current_user.id, action="update", entity_type="classroom", entity_id=classroom_id
    )
    return classroom


@router.delete("/{classroom_id}")
def delete_classroom(
    classroom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    repo = ClassroomRepository(db)
    deleted = repo.delete(classroom_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    AuditLogRepository(db).create(
        user_id=current_user.id, action="delete", entity_type="classroom", entity_id=classroom_id
    )
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
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    """Enroll one or more students into a classroom (optionally for a specific subject).

    Duplicate enrollments are silently skipped.
    """
    classroom_repo = ClassroomRepository(db)
    if not classroom_repo.get(classroom_id):
        raise HTTPException(status_code=404, detail="Classroom not found")

    enr_repo = ClassroomEnrollmentRepository(db)
    enrolled = enr_repo.bulk_enroll(
        student_ids=payload.student_ids,
        classroom_id=classroom_id,
        subject_id=payload.subject_id,
        enrolled_by=current_user.id,
    )
    AuditLogRepository(db).create(
        user_id=current_user.id, action="enroll", entity_type="classroom",
        entity_id=classroom_id,
        details=f"Enrolled {len(enrolled)} students (subject_id={payload.subject_id})"
    )
    return {
        "classroom_id": classroom_id,
        "enrolled_count": len(enrolled),
        "enrolled_student_ids": enrolled,
        "skipped": len(payload.student_ids) - len(enrolled),
    }


@router.get("/{classroom_id}/enrollments")
def list_enrollments(
    classroom_id: int,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all students enrolled in a classroom."""
    enr_repo = ClassroomEnrollmentRepository(db)
    student_repo = StudentRepository(db)
    enrollments = enr_repo.get_enrolled_students(classroom_id, subject_id)
    result = []
    for e in enrollments:
        student = student_repo.get(e.student_id)
        result.append({
            "enrollment_id": e.id,
            "student_id": e.student_id,
            "student_name": student.full_name if student else None,
            "register_number": student.register_number if student else None,
            "department": student.department if student else None,
            "section": student.section if student else None,
            "subject_id": e.subject_id,
            "is_active": e.is_active,
            "created_at": e.created_at,
        })
    return {"total": len(result), "classroom_id": classroom_id, "enrollments": result}


@router.delete("/{classroom_id}/enrollments/{enrollment_id}")
def unenroll_student(
    classroom_id: int,
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    """Remove a student's enrollment from a classroom."""
    enr_repo = ClassroomEnrollmentRepository(db)
    enrollment = enr_repo.get(enrollment_id)
    if not enrollment or enrollment.classroom_id != classroom_id:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    enr_repo.delete(enrollment_id)
    AuditLogRepository(db).create(
        user_id=current_user.id, action="unenroll", entity_type="classroom",
        entity_id=classroom_id,
        details=f"Removed enrollment_id={enrollment_id} student_id={enrollment.student_id}"
    )
    return {"message": "Student unenrolled", "enrollment_id": enrollment_id}
