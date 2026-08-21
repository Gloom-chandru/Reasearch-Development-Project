"""Repository implementations for each model — Part 1: Core entities."""

from app.repositories.base import BaseRepository
from app.models.user import User
from app.models.student import Student
from app.models.face_embedding import FaceEmbedding


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