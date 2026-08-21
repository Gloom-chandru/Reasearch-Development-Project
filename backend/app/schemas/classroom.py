"""Classroom schemas."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ClassroomCreate(BaseModel):
    name: str = Field(..., max_length=80)
    code: str = Field(..., max_length=20)
    floor: Optional[int] = None
    capacity: Optional[int] = None
    entry_zone_x1: float = Field(default=0.2, ge=0, le=1)
    entry_zone_y1: float = Field(default=0.2, ge=0, le=1)
    entry_zone_x2: float = Field(default=0.8, ge=0, le=1)
    entry_zone_y2: float = Field(default=0.8, ge=0, le=1)


class ClassroomResponse(BaseModel):
    id: int
    name: str
    code: str
    floor: Optional[int]
    capacity: Optional[int]
    entry_zone_x1: float
    entry_zone_y1: float
    entry_zone_x2: float
    entry_zone_y2: float
    is_active: bool

    class Config:
        from_attributes = True


class ClassroomListResponse(BaseModel):
    total: int
    classrooms: list[ClassroomResponse]