"""Auth service — authentication and user management."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.repository_core import UserRepository
from app.utils.security import hash_password, verify_password, create_access_token
from app.schemas.auth import LoginRequest, UserCreate
from app.utils.logging import logger


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

    def login(self, request: LoginRequest):
        user = self.user_repo.get_by_username(request.username)
        if not user or not verify_password(request.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )
        token = create_access_token(data={"sub": user.id})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": user,
        }

    def create_user(self, data: UserCreate):
        existing = self.user_repo.get_by_username(data.username)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken",
            )
        existing_email = self.user_repo.get_by_email(data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        if data.role not in ("super_admin", "hod", "coordinator", "faculty"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role",
            )
        hashed = hash_password(data.password)
        user = self.user_repo.create(
            username=data.username,
            email=data.email,
            hashed_password=hashed,
            full_name=data.full_name,
            role=data.role,
        )
        logger.info(f"Created user: {user.username} ({user.role})")
        return user