"""System events — camera status, service health, errors."""

from __future__ import annotations

import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Integer, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
import enum

from app.models.base import Base


class EventLevel(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SystemEvent(Base):
    __tablename__ = "system_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    source: Mapped[str] = mapped_column(String(60), nullable=False)  # e.g. camera, recognition, db
    level: Mapped[EventLevel] = mapped_column(
        SAEnum(EventLevel, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=EventLevel.INFO,
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def __repr__(self) -> str:
        return (
            f"<SystemEvent {self.id}: [{self.level.value}] "
            f"{self.source} — {self.message[:60]}>"
        )