"""Attendance session schemas."""

from __future__ import annotations

import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    classroom_id: int
    subject_id: int
    faculty_id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=200)
    scheduled_start: datetime.datetime
    scheduled_end: datetime.datetime
    late_start_offset: int = Field(default=5, ge=0)
    late_end_offset: int = Field(default=15, ge=0)


class SessionUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    scheduled_start: Optional[datetime.datetime] = None
    scheduled_end: Optional[datetime.datetime] = None
    late_start_offset: Optional[int] = Field(None, ge=0)
    late_end_offset: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None


class SessionResponse(BaseModel):
    id: int
    classroom_id: int
    subject_id: int
    faculty_id: Optional[int]
    title: str
    scheduled_start: datetime.datetime
    scheduled_end: datetime.datetime
    late_start_offset: int
    late_end_offset: int
    status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class SessionListResponse(BaseModel):
    total: int
    sessions: list[SessionResponse]