"""Audit log API — read-only access to the correction and action audit trail."""

from __future__ import annotations

from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user, require_role
from app.models.audit import AuditLog
from app.models.user import User
from app.repositories.repository_core import UserRepository

router = APIRouter(prefix="/api/audit", tags=["audit"])


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    username: Optional[str]
    action: str
    entity_type: str
    entity_id: Optional[int]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/logs", response_model=dict)
def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None, description="Filter by action type"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    """Return paginated audit log entries, newest first.

    Accessible by coordinators and above — not faculty, as this contains
    sensitive correction and login history.
    """
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if user_id is not None:
        q = q.filter(AuditLog.user_id == user_id)

    total = q.count()
    logs = q.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()

    # Batch-fetch usernames to avoid N+1
    user_ids = {l.user_id for l in logs if l.user_id is not None}
    user_repo = UserRepository(db)
    users = {u.id: u.username for u in [user_repo.get(uid) for uid in user_ids] if u}

    entries = []
    for log in logs:
        entries.append({
            "id": log.id,
            "user_id": log.user_id,
            "username": users.get(log.user_id, "system"),
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat(),
        })

    return {"total": total, "skip": skip, "limit": limit, "logs": entries}


@router.get("/actions", response_model=list)
def list_audit_action_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    """Return distinct action types seen in the audit log (for filter dropdowns)."""
    from sqlalchemy import distinct
    rows = db.query(distinct(AuditLog.action)).all()
    return sorted(r[0] for r in rows if r[0])
