"""Notice service — manage classroom notifications."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.repository_sessions import NoticeRepository
from app.schemas.notice import NoticeCreate
from app.utils.logging import logger


class NoticeService:
    def __init__(self, db: Session):
        self.db = db
        self.notice_repo = NoticeRepository(db)

    def create_notice(self, data: NoticeCreate, created_by: int):
        notice = self.notice_repo.create(
            title=data.title,
            body=data.body,
            priority=data.priority,
            classroom_id=data.classroom_id,
            created_by=created_by,
            valid_from=data.valid_from,
            valid_until=data.valid_until,
        )
        logger.info(f"Created notice: {notice.id} - {notice.title}")
        return notice

    def get_notice(self, notice_id: int):
        notice = self.notice_repo.get(notice_id)
        if not notice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found"
            )
        return notice

    def list_active_notices(self, classroom_id: int = None):
        notices = self.notice_repo.get_active_notices(classroom_id)
        return {"total": len(notices), "notices": notices}

    def deactivate_notice(self, notice_id: int):
        notice = self.notice_repo.get(notice_id)
        if not notice:
            raise HTTPException(status_code=404, detail="Notice not found")
        notice.is_active = False
        self.db.commit()
        return notice

    def delete_notice(self, notice_id: int):
        deleted = self.notice_repo.delete(notice_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Notice not found")
        return {"message": "Notice deleted"}