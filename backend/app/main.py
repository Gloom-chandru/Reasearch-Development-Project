"""Main FastAPI application entry point."""

from __future__ import annotations

import time
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import DefaultDict, List

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base
from app.utils.logging import logger

# ── Import all models so they register with Base.metadata ──────────
from app.models import *  # noqa: F401, F403

# ── Import routers ─────────────────────────────────────────────────
from app.api.auth import router as auth_router
from app.api.students import router as students_router
from app.api.classrooms import router as classrooms_router
from app.api.sessions import router as sessions_router
from app.api.notices import router as notices_router
from app.api.experiments import router as experiments_router
from app.api.enrollment import router as enrollment_router
from app.api.realtime import router as realtime_router
from app.api.reports import router as reports_router
from app.api.dashboard import router as dashboard_router
from app.api.audit import router as audit_router


# ── Secret key safety check ────────────────────────────────────────
_INSECURE_DEFAULT = "change-this-to-a-long-random-string-production"
if settings.SECRET_KEY == _INSECURE_DEFAULT:
    import warnings
    warnings.warn(
        "\n\n⚠️  SECRET_KEY is set to the insecure default value.\n"
        "   Set SECRET_KEY to a long random string in your .env file before any deployment.\n"
        "   Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\"\n",
        UserWarning,
        stacklevel=1,
    )


# ── In-process rate limiter (auth endpoints only) ──────────────────
# Tracks failed attempts per IP.  On first N failures within the window,
# the IP is temporarily blocked.  This is a simple in-memory solution —
# suitable for single-process deployments.  For multi-process / production
# use a Redis-backed limiter (e.g. slowapi).
_RATE_LIMIT_WINDOW = 60        # seconds
_RATE_LIMIT_MAX_ATTEMPTS = 10  # failed attempts before blocking
_rate_buckets: DefaultDict[str, List[float]] = defaultdict(list)


def _is_rate_limited(ip: str) -> bool:
    """Return True if `ip` has exceeded the auth failure rate limit."""
    now = time.monotonic()
    window = _RATE_LIMIT_WINDOW
    attempts = _rate_buckets[ip]
    # Drop stale entries
    _rate_buckets[ip] = [t for t in attempts if now - t < window]
    return len(_rate_buckets[ip]) >= _RATE_LIMIT_MAX_ATTEMPTS


def _record_auth_failure(ip: str) -> None:
    _rate_buckets[ip].append(time.monotonic())


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("Starting Smart Classroom backend...")
    # Create tables (use Alembic in production for schema migrations)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified/created.")

    # Seed default super_admin user if the users table is empty
    from app.database import SessionLocal
    from app.repositories.repository_core import UserRepository
    from app.utils.security import hash_password
    db = SessionLocal()
    try:
        user_repo = UserRepository(db)
        if not user_repo.list():
            user_repo.create(
                username="admin",
                email="admin@classroom.local",
                hashed_password=hash_password("admin123"),
                full_name="System Administrator",
                role="super_admin",
            )
            logger.info("Created default super_admin user (admin / admin123).")
    finally:
        db.close()

    yield
    logger.info("Shutting down Smart Classroom backend...")


app = FastAPI(
    title="Smart Classroom Communication System",
    description="AIoT-based real-time attendance and classroom communication",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth rate-limiting middleware ──────────────────────────────────
@app.middleware("http")
async def auth_rate_limit_middleware(request: Request, call_next):
    """Block IPs that repeatedly fail login within the rate-limit window."""
    is_login = request.url.path == "/api/auth/login" and request.method == "POST"
    if is_login:
        ip = request.client.host if request.client else "unknown"
        if _is_rate_limited(ip):
            return JSONResponse(
                status_code=429,
                content={
                    "detail": (
                        f"Too many failed login attempts. "
                        f"Please wait {_RATE_LIMIT_WINDOW}s before trying again."
                    )
                },
            )

    response: Response = await call_next(request)

    # Record failed logins (401 on the login endpoint)
    if is_login and response.status_code == 401:
        ip = request.client.host if request.client else "unknown"
        _record_auth_failure(ip)

    return response


# ── Routers ────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(students_router)
app.include_router(classrooms_router)
app.include_router(sessions_router)
app.include_router(notices_router)
app.include_router(experiments_router)
app.include_router(enrollment_router)
app.include_router(realtime_router)
app.include_router(reports_router)
app.include_router(dashboard_router)
app.include_router(audit_router)


# ── Global error handler ───────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


# ── Health check ───────────────────────────────────────────────────
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "secret_key_secure": settings.SECRET_KEY != _INSECURE_DEFAULT,
    }


# ── Run (development) ──────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.LOG_LEVEL.lower(),
    )
