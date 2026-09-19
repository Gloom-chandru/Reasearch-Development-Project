"""Application configuration via Pydantic Settings."""

from __future__ import annotations

import os
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    # CORS
    ORIGINS: List[str] = ["*"]

    # Database
    DATABASE_URL: str = "sqlite:///./classroom.db"

    # JWT & Cookie Auth
    SECRET_KEY: str = "change-this-to-a-long-random-string-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    COOKIE_NAME: str = "access_token"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"  # Shipped default per Section 0.1
    CSRF_COOKIE_NAME: str = "csrf_token"
    CSRF_HEADER_NAME: str = "X-CSRF-Token"

    # Shared Cache (Redis)
    REDIS_URL: Optional[str] = None

    # Database Migrations
    AUTO_MIGRATE: bool = True
    DEV_CREATE_ALL: bool = False

    # Recognition
    RECOGNITION_MODEL: str = "insightface"
    RECOGNITION_THRESHOLD: float = 0.40
    MIN_FACE_SIZE: int = 80
    BLUR_THRESHOLD: float = 80.0
    FACE_CONFIRMATION_FRAMES: int = 5

    # Liveness & Anti-Spoofing
    PASSIVE_LIVENESS_ENABLED: bool = True
    PASSIVE_LIVENESS_THRESHOLD: float = 0.50

    # Session timing defaults
    SESSION_START_OFFSET_MINUTES: int = 0
    SESSION_LATE_START_MINUTES: int = 5
    SESSION_LATE_END_MINUTES: int = 15
    SESSION_DURATION_MINUTES: int = 60

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30

    # Auth rate limiting (in-process, resets on restart)
    RATE_LIMIT_WINDOW_SECONDS: int = 60      # sliding window duration
    RATE_LIMIT_MAX_FAILURES: int = 10        # failures before blocking

    # Logging & Observability
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/classroom.log"
    REQUEST_ID_HEADER: str = "X-Request-ID"

    # Initial admin seed password (override via ADMIN_PASSWORD env var)
    ADMIN_PASSWORD: str = "admin123"

    # LED / IoT
    LED_ENABLED: bool = False
    LED_MODE: str = "mqtt"  # or http
    MQTT_BROKER: str = "localhost"
    MQTT_PORT: int = 1883
    MQTT_TOPIC: str = "classroom/led"

    # Research Assistant / LLM (optional; deterministic fallback active if unset)
    LLM_API_KEY: Optional[str] = None
    LLM_MODEL: str = "llama-3.3-70b-versatile"


settings = Settings()

LOG_LEVEL_MAP = {
    "DEBUG": 10,
    "INFO": 20,
    "WARNING": 30,
    "ERROR": 40,
    "CRITICAL": 50,
}


def get_log_level() -> int:
    return LOG_LEVEL_MAP.get(settings.LOG_LEVEL.upper(), 20)