"""Student model — enrolled participants."""

from __future__ import annotations

import datetime
from typing import Optional, List

from sqlalchemy import String, DateTime, Boolean, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    register_number: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    department: Mapped[str] = mapped_column(String(60), nullable=False)
    section: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    enrollment_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    # relationships
    face_embeddings: Mapped[List["FaceEmbedding"]] = relationship(
        "FaceEmbedding", back_populates="student", cascade="all, delete-orphan"
    )
    attendance_records: Mapped[List["AttendanceRecord"]] = relationship(
        "AttendanceRecord", back_populates="student"
    )

    def __repr__(self) -> str:
        return f"<Student {self.id}: {self.register_number} - {self.full_name}>"