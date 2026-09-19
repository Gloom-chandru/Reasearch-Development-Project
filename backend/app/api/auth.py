"""Auth API routes."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from app.config import settings

# ── Login & Logout ─────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, req: Request, response: Response, db: Session = Depends(get_db)):
    """Authenticate, issue JWT and CSRF token, and set httpOnly cookie."""
    ip = req.client.host if req.client else None
    service = AuthService(db)
    result = service.login(request, ip_address=ip)

    # Set httpOnly cookie for access token (SameSite=Lax per Section 0.1)
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=result["access_token"],
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )

    # Set non-httpOnly cookie for CSRF token (readable by frontend JS)
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=result["csrf_token"],
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )

    return result


@router.post("/logout")
def logout(response: Response):
    """Clear auth and CSRF cookies."""
    response.delete_cookie(key=settings.COOKIE_NAME, path="/")
    response.delete_cookie(key=settings.CSRF_COOKIE_NAME, path="/")
    return {"message": "Logged out"}


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
    service = AuthService(db)
    return service.reactivate_user(user_id, reactivated_by_id=current_user.id)
