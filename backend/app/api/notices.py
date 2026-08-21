"""Notice API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user, require_role
from app.schemas.notice import NoticeCreate, NoticeResponse, NoticeListResponse
from app.services.notice_service import NoticeService
from app.models.user import User

router = APIRouter(prefix="/api/notices", tags=["notices"])


@router.post("", response_model=NoticeResponse)
def create_notice(
    data: NoticeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator", "faculty")),
):
    service = NoticeService(db)
    return service.create_notice(data, current_user.id)


@router.get("/active", response_model=NoticeListResponse)
def get_active_notices(
    classroom_id: int = None,
    db: Session = Depends(get_db),
):
    service = NoticeService(db)
    return service.list_active_notices(classroom_id)


@router.get("", response_model=NoticeListResponse)
def list_notices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.repositories.repository_sessions import NoticeRepository
    repo = NoticeRepository(db)
    notices = repo.list()
    return {"total": len(notices), "notices": notices}


@router.get("/{notice_id}", response_model=NoticeResponse)
def get_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = NoticeService(db)
    return service.get_notice(notice_id)


@router.delete("/{notice_id}")
def delete_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    service = NoticeService(db)
    return service.delete_notice(notice_id)


@router.post("/{notice_id}/deactivate", response_model=NoticeResponse)
def deactivate_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    service = NoticeService(db)
    return service.deactivate_notice(notice_id)