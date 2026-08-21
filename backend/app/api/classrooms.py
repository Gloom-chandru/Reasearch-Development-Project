"""Classroom API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user, require_role
from app.schemas.classroom import ClassroomCreate, ClassroomResponse, ClassroomListResponse
from app.repositories.repository_sessions import ClassroomRepository
from app.models.user import User

router = APIRouter(prefix="/api/classrooms", tags=["classrooms"])


@router.post("", response_model=ClassroomResponse)
def create_classroom(
    data: ClassroomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    repo = ClassroomRepository(db)
    classroom = repo.create(**data.model_dump())
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
        from fastapi import HTTPException, status
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
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
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
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    return {"message": "Classroom deleted"}