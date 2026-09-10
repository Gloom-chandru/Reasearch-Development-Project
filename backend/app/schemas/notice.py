"""Notice schemas.

Datetime serialization note
---------------------------
All datetime fields are stored in the DB as UTC naive datetimes (no tzinfo).
Pydantic v2 by default serializes them as "2026-09-10T05:05:55" — no timezone
suffix. JavaScript's Date constructor treats timezone-naive strings as LOCAL
time on most browsers, causing "5 minute" notices to expire immediately in
non-UTC timezones.

Fix: use a custom serializer that appends 'Z' to force UTC interpretation
on the client side.
"""

from __future__ import annotations

import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_serializer


def _utc_iso(dt: Optional[datetime.datetime]) -> Optional[str]:
    """Serialize a naive UTC datetime as an ISO string with Z suffix."""
    if dt is None:
        return None
    # Strip any existing tzinfo and always emit Z
    return dt.replace(tzinfo=None).strftime('%Y-%m-%dT%H:%M:%S.%f') + 'Z'


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

    # Serialize all datetime fields with Z suffix so browsers treat them as UTC
    @field_serializer('valid_from', 'valid_until', 'created_at')
    def serialize_dt(self, v: Optional[datetime.datetime]) -> Optional[str]:
        return _utc_iso(v)


class NoticeListResponse(BaseModel):
    total: int
    notices: list[NoticeResponse]
