"""Student-related Pydantic schemas."""

from __future__ import annotations

import datetime
from typing import Optional

from pydantic import BaseModel, Field


class StudentCreate(BaseModel):
    register_number: str = Field(..., min_length=1, max_length=30)
    full_name: str = Field(..., min_length=1, max_length=120)
    department: str = Field(..., max_length=60)
    section: str = Field(..., max_length=20)
    email: Optional[str] = Field(None, max_length=120)


class StudentUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=120)
    department: Optional[str] = Field(None, max_length=60)
    section: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=120)
    is_active: Optional[bool] = None


class StudentResponse(BaseModel):
    id: int
    register_number: str
    full_name: str
    department: str
    section: str
    email: Optional[str]
    is_active: bool
    enrollment_count: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class StudentListResponse(BaseModel):
    total: int
    students: list[StudentResponse]