"""Face embedding storage — one row per embedding vector."""

from __future__ import annotations

import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Integer, Float, LargeBinary, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class FaceEmbedding(Base):
    """Stores face embeddings (binary) for enrolled students.

    Enrollment images are NOT stored; only the embedding vector is kept.
    Each student may have multiple embeddings (5–10 enrollment samples).
    """

    __tablename__ = "face_embeddings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    embedding: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    dimension: Mapped[int] = mapped_column(Integer, nullable=False, default=512)
    quality_label: Mapped[str] = mapped_column(
        String(20), nullable=False, default="GOOD"
    )  # GOOD / ACCEPTABLE / REJECT
    quality_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    capture_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    # relationships
    student: Mapped["Student"] = relationship(
        "Student", back_populates="face_embeddings"
    )

    def __repr__(self) -> str:
        return (
            f"<FaceEmbedding {self.id}: student={self.student_id} "
            f"quality={self.quality_label}>"
        )