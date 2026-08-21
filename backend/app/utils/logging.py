"""Structured logging utility."""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import settings, get_log_level


class StructuredFormatter(logging.Formatter):
    """JSON-formatted log records for parseability."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if hasattr(record, "extra"):
            log_entry["extra"] = record.extra
        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


def setup_logging(name: str = "classroom") -> logging.Logger:
    """Configure and return a structured logger."""
    logger = logging.getLogger(name)
    logger.setLevel(get_log_level())

    # Console handler
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(StructuredFormatter())
    logger.addHandler(console)

    # File handler (ensure directory exists)
    log_path = Path(settings.LOG_FILE)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    file_handler = logging.FileHandler(str(log_path))
    file_handler.setFormatter(StructuredFormatter())
    logger.addHandler(file_handler)

    return logger


logger = setup_logging()