"""Student service — CRUD with enrollment tracking."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.repository_core import StudentRepository, FaceEmbeddingRepository
from app.repositories.repository_sessions import AttendanceRecordRepository
from app.schemas.student import StudentCreate, StudentUpdate
from app.utils.logging import logger


class StudentService:
    def __init__(self, db: Session):
        self.db = db
        self.student_repo = StudentRepository(db)
        self.embedding_repo = FaceEmbeddingRepository(db)
        self.attendance_repo = AttendanceRecordRepository(db)

    def create_student(self, data: StudentCreate):
        existing = self.student_repo.get_by_register_number(data.register_number)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Student with this register number already exists",
            )
        student = self.student_repo.create(**data.model_dump())
        logger.info(f"Created student: {student.register_number} - {student.full_name}")
        return student

    def get_student(self, student_id: int):
        student = self.student_repo.get(student_id)
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Student not found"
            )
        return student

    def list_students(self, skip: int = 0, limit: int = 100, **filters):
        students = self.student_repo.list(skip=skip, limit=limit, **filters)
        total = len(students)
        return {"total": total, "students": students}

    def update_student(self, student_id: int, data: StudentUpdate):
        student = self.student_repo.update(student_id, **data.model_dump(exclude_none=True))
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Student not found"
            )
        return student

    def delete_student(self, student_id: int):
        deleted = self.student_repo.delete(student_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Student not found"
            )
        logger.info(f"Deleted student: {student_id}")
        return {"message": "Student deleted"}