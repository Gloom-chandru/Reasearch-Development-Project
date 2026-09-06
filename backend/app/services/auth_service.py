"""Auth service — authentication and user management."""

from __future__ import annotations

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.repositories.repository_core import UserRepository
from app.repositories.repository_logging import AuditLogRepository, SystemEventRepository
from app.utils.security import hash_password, verify_password, create_access_token
from app.schemas.auth import LoginRequest, UserCreate
from app.utils.logging import logger


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.audit_repo = AuditLogRepository(db)
        self.system_event_repo = SystemEventRepository(db)

    def _audit(self, user_id, action, entity_type="user", entity_id=None, details="", ip=None):
        try:
            self.audit_repo.create(
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details=details,
                ip_address=ip,
            )
        except Exception as e:
            logger.warning(f"Audit write failed: {e}")

    def _sys_event(self, level, message, source="auth_service", details=""):
        try:
            self.system_event_repo.create(
                source=source, level=level, message=message, details=details
            )
        except Exception as e:
            logger.warning(f"System event write failed: {e}")

    def login(self, request: LoginRequest, ip_address: str = None):
        user = self.user_repo.get_by_username(request.username)
        if not user or not verify_password(request.password, user.hashed_password):
            # Audit failed login attempt (no user_id since identity unverified)
            self._sys_event(
                "warning",
                f"Failed login attempt for username='{request.username}'",
                details=f"ip={ip_address}",
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )
        if not user.is_active:
            self._sys_event(
                "warning",
                f"Login attempt on deactivated account: username='{user.username}'",
                details=f"ip={ip_address}",
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )
        token = create_access_token(data={"sub": user.id})
        self._audit(
            user_id=user.id,
            action="login",
            entity_type="user",
            entity_id=user.id,
            details=f"Successful login",
            ip=ip_address,
        )
        logger.info(f"User login: {user.username} ({user.role})")
        return {"access_token": token, "token_type": "bearer", "user": user}

    def create_user(self, data: UserCreate, created_by_id: int = None):
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
                detail="Invalid role — must be super_admin, hod, coordinator, or faculty",
            )
        hashed = hash_password(data.password)
        user = self.user_repo.create(
            username=data.username,
            email=data.email,
            hashed_password=hashed,
            full_name=data.full_name,
            role=data.role,
        )
        self._audit(
            user_id=created_by_id,
            action="create_user",
            entity_type="user",
            entity_id=user.id,
            details=f"Created user '{user.username}' with role '{user.role}'",
        )
        self._sys_event("info", f"New user created: {user.username} ({user.role})")
        logger.info(f"Created user: {user.username} ({user.role})")
        return user

    def update_user(self, user_id: int, updates: dict, updated_by_id: int = None):
        """Update user fields (email, full_name, is_active, password)."""
        user = self.user_repo.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if "password" in updates:
            updates["hashed_password"] = hash_password(updates.pop("password"))
        updated = self.user_repo.update(user_id, **updates)
        self._audit(
            user_id=updated_by_id,
            action="update_user",
            entity_type="user",
            entity_id=user_id,
            details=f"Updated fields: {list(updates.keys())}",
        )
        return updated

    def deactivate_user(self, user_id: int, deactivated_by_id: int = None):
        """Soft-deactivate a user account."""
        user = self.user_repo.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        self.user_repo.update(user_id, is_active=False)
        self._audit(
            user_id=deactivated_by_id,
            action="deactivate_user",
            entity_type="user",
            entity_id=user_id,
        )
        self._sys_event("warning", f"User deactivated: {user.username}")
        return {"message": f"User {user.username} deactivated"}
