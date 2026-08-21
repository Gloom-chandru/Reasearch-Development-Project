"""Subject model."""

from __future__ import annotations

from typing import List

from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    department: Mapped[str] = mapped_column(String(60), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    sessions: Mapped[List["AttendanceSession"]] = relationship(
        "AttendanceSession", back_populates="subject"
    )

    def __repr__(self) -> str:
        return f"<Subject {self.code}: {self.name}>"