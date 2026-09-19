"""Classroom service — business logic for classroom management and student enrollment linking."""

from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.classroom import Classroom
from app.repositories.repository_core import ClassroomEnrollmentRepository, StudentRepository
from app.repositories.repository_logging import AuditLogRepository
from app.repositories.repository_sessions import ClassroomRepository, AttendanceConfigurationRepository


class ClassroomService:
    def __init__(self, db: Session):
        self.db = db
        self.classroom_repo = ClassroomRepository(db)
        self.enrollment_repo = ClassroomEnrollmentRepository(db)
        self.student_repo = StudentRepository(db)
        self.audit_repo = AuditLogRepository(db)
        self.config_repo = AttendanceConfigurationRepository(db)

    def create_classroom(self, data: dict, user_id: int) -> Classroom:
        classroom = self.classroom_repo.create(**data)
        self.audit_repo.create(
            user_id=user_id,
            action="create",
            entity_type="classroom",
            entity_id=classroom.id,
            details=f"Created classroom '{classroom.name}' ({classroom.code})",
        )
        cfg = self.config_repo.get_for_classroom(classroom.id)
        classroom.threshold_validated = cfg.threshold_validated if cfg else False
        classroom.recognition_threshold = cfg.recognition_threshold if cfg else 0.40
        return classroom

    def list_classrooms(self) -> List[Classroom]:
        classrooms = self.classroom_repo.list()
        for c in classrooms:
            cfg = self.config_repo.get_for_classroom(c.id)
            c.threshold_validated = cfg.threshold_validated if cfg else False
            c.recognition_threshold = cfg.recognition_threshold if cfg else 0.40
        return classrooms

    def get_classroom(self, classroom_id: int) -> Classroom:
        classroom = self.classroom_repo.get(classroom_id)
        if not classroom:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
        cfg = self.config_repo.get_for_classroom(classroom.id)
        classroom.threshold_validated = cfg.threshold_validated if cfg else False
        classroom.recognition_threshold = cfg.recognition_threshold if cfg else 0.40
        return classroom

    def update_classroom(self, classroom_id: int, data: dict, user_id: int) -> Classroom:
        classroom = self.classroom_repo.update(classroom_id, **data)
        if not classroom:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
        self.audit_repo.create(
            user_id=user_id,
            action="update",
            entity_type="classroom",
            entity_id=classroom_id,
            details=f"Updated classroom {classroom.code}",
        )
        return classroom

    def delete_classroom(self, classroom_id: int, user_id: int) -> bool:
        deleted = self.classroom_repo.delete(classroom_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
        self.audit_repo.create(
            user_id=user_id,
            action="delete",
            entity_type="classroom",
            entity_id=classroom_id,
            details=f"Deleted classroom {classroom_id}",
        )
        return True

    def enroll_students(
        self, classroom_id: int, student_ids: List[int], subject_id: Optional[int], user_id: int
    ) -> Dict:
        if not self.classroom_repo.get(classroom_id):
            raise HTTPException(status_code=404, detail="Classroom not found")

        enrolled = self.enrollment_repo.bulk_enroll(
            student_ids=student_ids,
            classroom_id=classroom_id,
            subject_id=subject_id,
            enrolled_by=user_id,
        )
        self.audit_repo.create(
            user_id=user_id,
            action="enroll",
            entity_type="classroom",
            entity_id=classroom_id,
            details=f"Enrolled {len(enrolled)} students (subject_id={subject_id})",
        )
        return {
            "classroom_id": classroom_id,
            "enrolled_count": len(enrolled),
            "enrolled_student_ids": enrolled,
            "skipped": len(student_ids) - len(enrolled),
        }

    def list_enrollments(self, classroom_id: int, subject_id: Optional[int] = None) -> List[Dict]:
        enrollments = self.enrollment_repo.get_enrolled_students(classroom_id, subject_id)
        result = []
        for e in enrollments:
            student = self.student_repo.get(e.student_id)
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
        return result

    def unenroll_student(self, classroom_id: int, enrollment_id: int, user_id: int) -> Dict:
        enrollment = self.enrollment_repo.get(enrollment_id)
        if not enrollment or enrollment.classroom_id != classroom_id:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        self.enrollment_repo.delete(enrollment_id)
        self.audit_repo.create(
            user_id=user_id,
            action="unenroll",
            entity_type="classroom",
            entity_id=classroom_id,
            details=f"Removed enrollment_id={enrollment_id} student_id={enrollment.student_id}",
        )
        return {"message": "Student unenrolled", "enrollment_id": enrollment_id}
