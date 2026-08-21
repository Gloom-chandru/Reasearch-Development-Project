"""Application configuration via Pydantic Settings."""

from __future__ import annotations

import os
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # CORS
    ORIGINS: List[str] = ["*"]

    # Database
    DATABASE_URL: str = "sqlite:///./classroom.db"

    # JWT
    SECRET_KEY: str = "change-this-to-a-long-random-string-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Recognition
    RECOGNITION_MODEL: str = "insightface"
    RECOGNITION_THRESHOLD: float = 0.40
    MIN_FACE_SIZE: int = 80
    BLUR_THRESHOLD: float = 80.0
    FACE_CONFIRMATION_FRAMES: int = 5

    # Session timing defaults
    SESSION_START_OFFSET_MINUTES: int = 0
    SESSION_LATE_START_MINUTES: int = 5
    SESSION_LATE_END_MINUTES: int = 15
    SESSION_DURATION_MINUTES: int = 60

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/classroom.log"

    # LED / IoT
    LED_ENABLED: bool = False
    LED_MODE: str = "mqtt"  # or http
    MQTT_BROKER: str = "localhost"
    MQTT_PORT: int = 1883
    MQTT_TOPIC: str = "classroom/led"

    class Config:
        env_file = ".env"
        case_sensitive = True


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