"""Database engine, session factory, and dependency."""

from __future__ import annotations

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base, Session

from app.config import settings

# ── Engine ──────────────────────────────────────────────────────────
if settings.DATABASE_URL.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=_connect_args,
        echo=False,
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        """Enable foreign-keys for SQLite (off by default)."""
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.close()
else:
    engine = create_engine(settings.DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# ── Dependency ───────────────────────────────────────────────────────
def get_db() -> Session:
    """FastAPI dependency — yields a DB session and closes it on teardown."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()