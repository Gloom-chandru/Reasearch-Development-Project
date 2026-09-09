"""Notice schemas."""

from __future__ import annotations

import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class NoticeCreate(BaseModel):
    title: str = Field(..., max_length=200)
    body: str = Field(..., min_length=1)
    priority: int = Field(default=0, ge=0)
    classroom_id: Optional[int] = None
    valid_from: Optional[datetime.datetime] = None
    valid_until: Optional[datetime.datetime] = None


class NoticeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    body: str
    priority: int
    classroom_id: Optional[int]
    created_by: int
    valid_from: datetime.datetime
    valid_until: Optional[datetime.datetime]
    is_active: bool
    created_at: datetime.datetime


class NoticeListResponse(BaseModel):
    total: int
    notices: list[NoticeResponse]