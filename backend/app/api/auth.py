"""Auth API routes."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user, require_role
from app.schemas.auth import LoginRequest, LoginResponse, UserCreate, UserResponse
from app.services.auth_service import AuthService
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Login ──────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    """Authenticate and return a JWT.  IP address is captured for audit logging."""
    ip = req.client.host if req.client else None
    service = AuthService(db)
    return service.login(request, ip_address=ip)


# ── User management ────────────────────────────────────────────────────────────

@router.post("/users", response_model=UserResponse)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod")),
):
    service = AuthService(db)
    return service.create_user(data, created_by_id=current_user.id)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator")),
):
    from app.repositories.repository_core import UserRepository
    return UserRepository(db).list()


class UserUpdateRequest(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=120)
    password: Optional[str] = Field(None, min_length=8)
    is_active: Optional[bool] = None


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod")),
):
    """Update user fields.  Password is hashed server-side."""
    service = AuthService(db)
    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    return service.update_user(user_id, updates, updated_by_id=current_user.id)


@router.post("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """Soft-deactivate a user account (prevents login, preserves audit history)."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    service = AuthService(db)
    return service.deactivate_user(user_id, deactivated_by_id=current_user.id)


@router.post("/users/{user_id}/reactivate")
def reactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
):
    """Re-activate a previously deactivated user."""
    from app.repositories.repository_core import UserRepository
    from app.repositories.repository_logging import AuditLogRepository
    repo = UserRepository(db)
    user = repo.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    repo.update(user_id, is_active=True)
    AuditLogRepository(db).create(
        user_id=current_user.id, action="reactivate_user",
        entity_type="user", entity_id=user_id,
    )
    return {"message": f"User {user.username} reactivated"}
