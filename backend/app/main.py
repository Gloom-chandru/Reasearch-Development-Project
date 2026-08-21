"""Main FastAPI application entry point."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("Starting Smart Classroom backend...")
    # Create tables (use alembic in production)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified/created.")
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

# ── Routers ──────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(students_router)
app.include_router(classrooms_router)
app.include_router(sessions_router)
app.include_router(notices_router)
app.include_router(experiments_router)


# ── Global error handler ─────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


# ── Health check ────────────────────────────────────────────────────
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}


# ── Run (for development) ───────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.LOG_LEVEL.lower(),
    )