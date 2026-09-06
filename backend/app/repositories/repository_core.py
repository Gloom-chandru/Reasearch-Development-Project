"""Repository implementations for each model — Part 1: Core entities."""

from app.repositories.base import BaseRepository
from app.models.user import User
from app.models.student import Student
from app.models.face_embedding import FaceEmbedding
from app.models.enrollment import ClassroomEnrollment


class UserRepository(BaseRepository[User]):
    def __init__(self, db):
        super().__init__(User, db)

    def get_by_username(self, username: str):
        return self.db.query(User).filter(User.username == username).first()

    def get_by_email(self, email: str):
        return self.db.query(User).filter(User.email == email).first()


class StudentRepository(BaseRepository[Student]):
    def __init__(self, db):
        super().__init__(Student, db)

    def get_by_register_number(self, register_number: str):
        return (
            self.db.query(Student)
            .filter(Student.register_number == register_number)
            .first()
        )

    def list_by_department(self, department: str, section: str = None):
        q = self.db.query(Student).filter(Student.department == department)
        if section:
            q = q.filter(Student.section == section)
        return q.all()


class FaceEmbeddingRepository(BaseRepository[FaceEmbedding]):
    def __init__(self, db):
        super().__init__(FaceEmbedding, db)

    def get_by_student(self, student_id: int):
        return (
            self.db.query(FaceEmbedding)
            .filter(FaceEmbedding.student_id == student_id)
            .all()
        )

    def get_all_embeddings(self):
        return self.db.query(FaceEmbedding).all()


class ClassroomEnrollmentRepository(BaseRepository[ClassroomEnrollment]):
    def __init__(self, db):
        super().__init__(ClassroomEnrollment, db)

    def get_enrolled_students(self, classroom_id: int, subject_id: int = None):
        """Return all active students enrolled in a classroom (optionally filtered by subject)."""
        q = (
            self.db.query(ClassroomEnrollment)
            .filter(
                ClassroomEnrollment.classroom_id == classroom_id,
                ClassroomEnrollment.is_active == True,
            )
        )
        if subject_id is not None:
            q = q.filter(ClassroomEnrollment.subject_id == subject_id)
        return q.all()

    def get_by_student_and_classroom(self, student_id: int, classroom_id: int, subject_id: int = None):
        q = self.db.query(ClassroomEnrollment).filter(
            ClassroomEnrollment.student_id == student_id,
            ClassroomEnrollment.classroom_id == classroom_id,
        )
        if subject_id is not None:
            q = q.filter(ClassroomEnrollment.subject_id == subject_id)
        return q.first()

    def bulk_enroll(self, student_ids: list, classroom_id: int, subject_id: int = None, enrolled_by: int = None):
        """Enroll multiple students, skipping duplicates."""
        from sqlalchemy.exc import IntegrityError
        created = []
        for sid in student_ids:
            try:
                enr = ClassroomEnrollment(
                    student_id=sid,
                    classroom_id=classroom_id,
                    subject_id=subject_id,
                    enrolled_by=enrolled_by,
                )
                self.db.add(enr)
                self.db.flush()
                created.append(sid)
            except IntegrityError:
                self.db.rollback()
        self.db.commit()
        return created