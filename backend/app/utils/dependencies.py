"""Dependencies for FastAPI — auth, db session, cookie inspection, CSRF validation."""

from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.utils.logging import logger
from app.utils.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate JWT from httpOnly cookie or Authorization Bearer header.

    Cookie auth is prioritized for browser sessions (XSS defense).
    Bearer header fallback ensures CLI, pytest, and mobile API clients work smoothly.
    """
    token: Optional[str] = None
    is_cookie_auth: bool = False

    # 1. Inspect Bearer header first for programmatic clients (CLI, pytest, external APIs)
    if credentials and credentials.credentials:
        token = credentials.credentials
        is_cookie_auth = False
    else:
        # Fall back to httpOnly cookie for browser sessions
        cookie_token = request.cookies.get(settings.COOKIE_NAME)
        if cookie_token:
            token = cookie_token
            is_cookie_auth = True

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    try:
        user_id: int = int(sub)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # 2. CSRF validation for state-changing requests using cookie auth
    if is_cookie_auth and request.method in ("POST", "PUT", "DELETE", "PATCH"):
        # Login is exempt
        if request.url.path != "/api/auth/login":
            header_csrf = request.headers.get(settings.CSRF_HEADER_NAME)
            cookie_csrf = request.cookies.get(settings.CSRF_COOKIE_NAME)
            if not header_csrf or not cookie_csrf or header_csrf != cookie_csrf:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF validation failed — missing or invalid X-CSRF-Token",
                )

    return user


def require_role(*roles: str):
    """Dependency factory: require current user to have one of the given roles."""
    role_set = set(roles)

    def _role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        if user_role not in role_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {', '.join(roles)}",
            )
        return current_user

    return _role_checker