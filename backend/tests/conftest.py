"""Pytest configuration and shared fixtures for Smart Classroom tests.

Provides:
- In-memory SQLite engine for isolated tests
- Database session fixture
- FastAPI test client fixture
- Default user fixture (admin)
- Authenticated client fixture
- Sample classroom/subject/student fixtures
"""

import sys
import os
import pytest
from datetime import datetime, timedelta
from typing import Generator

# Ensure backend root is on sys.path
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# Override settings before app import
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-for-unit-tests-only"

from app.config import settings  # noqa: E402
from app import database as app_database  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.utils.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402

# Force in-memory for tests
settings.DATABASE_URL = "sqlite:///:memory:"

# ── Engine & session for tests ──────────────────────────────────────
# Use a shared in-memory SQLite so all connections see the same schema.
# Without StaticPool, each new connection gets its own private DB and
# the lifespan's create_all() won't be visible to test requests.
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Patch the production engine to point at the same in-memory DB so the
# lifespan handler's create_all() and seed work correctly.
app_database.engine = test_engine
app_database.SessionLocal = TestingSessionLocal


def _override_get_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Override FastAPI dependency
app.dependency_overrides[get_db] = _override_get_db


# Import all models at module level so they register with metadata
from app.models import *  # noqa: F401, F403
from app.models.user import User  # noqa: E402
from app.models.student import Student  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def create_tables_once() -> Generator[None, None, None]:
    """Create all DB tables once per test session."""
    Base.metadata.create_all(bind=test_engine)
    yield


@pytest.fixture(autouse=True)
def _clean_db() -> Generator[None, None, None]:
    """Wipe all tables between tests for isolation.

    Uses raw DELETE statements (no DROP) since with :memory: + StaticPool,
    dropping tables would break the schema shared across the pool.
    """
    yield
    # Teardown: delete all rows from every table
    with test_engine.begin() as conn:
        # Get all tables in reverse dependency order
        for table in reversed(Base.metadata.sorted_tables):
            try:
                conn.execute(table.delete())
            except Exception:
                pass


@pytest.fixture
def db() -> Generator[Session, None, None]:
    """Per-test database session."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    """FastAPI test client with overridden DB session."""
    def _override():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def admin_user(db: Session):
    """Create a default super_admin user."""
    from app.repositories.repository_core import UserRepository
    repo = UserRepository(db)
    user = repo.create(
        username="testadmin",
        email="testadmin@example.com",
        hashed_password=hash_password("testpass123"),
        full_name="Test Admin",
        role="super_admin",
    )
    return user


@pytest.fixture
def hod_user(db: Session):
    """Create a HOD user."""
    from app.repositories.repository_core import UserRepository
    repo = UserRepository(db)
    return repo.create(
        username="testhod",
        email="testhod@example.com",
        hashed_password=hash_password("hodpass123"),
        full_name="Test HOD",
        role="hod",
    )


@pytest.fixture
def faculty_user(db: Session):
    """Create a faculty user."""
    from app.repositories.repository_core import UserRepository
    repo = UserRepository(db)
    return repo.create(
        username="testfaculty",
        email="testfaculty@example.com",
        hashed_password=hash_password("facultypass123"),
        full_name="Test Faculty",
        role="faculty",
    )


@pytest.fixture
def auth_token(client: TestClient, admin_user) -> str:
    """Get an authentication token for the admin user."""
    response = client.post(
        "/api/auth/login",
        json={"username": "testadmin", "password": "testpass123"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token: str) -> dict:
    """Authorization headers for authenticated requests."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def sample_classroom(db: Session):
    """Create a sample classroom for tests."""
    from app.repositories.repository_sessions import ClassroomRepository
    repo = ClassroomRepository(db)
    return repo.create(
        name="Test Room 101",
        code="TR101",
        floor=1,
        capacity=60,
        entry_zone_x1=0.2,
        entry_zone_y1=0.2,
        entry_zone_x2=0.8,
        entry_zone_y2=0.8,
    )


@pytest.fixture
def sample_subject(db: Session):
    """Create a sample subject for tests."""
    from app.repositories.repository_sessions import SubjectRepository
    repo = SubjectRepository(db)
    return repo.create(
        name="Computer Science 101",
        code="CS101",
        department="CSE",
    )


@pytest.fixture
def sample_student(db: Session):
    """Create a sample active student for tests."""
    from app.repositories.repository_core import StudentRepository
    repo = StudentRepository(db)
    return repo.create(
        register_number="REG2024001",
        full_name="Test Student",
        email="student@example.com",
        department="CSE",
        section="A",
        is_active=True,
        enrollment_count=0,
    )


@pytest.fixture
def sample_session(db: Session, sample_classroom, sample_subject, faculty_user):
    """Create a sample attendance session that is currently active."""
    from app.repositories.repository_sessions import AttendanceSessionRepository
    repo = AttendanceSessionRepository(db)
    now = datetime.utcnow()
    return repo.create(
        classroom_id=sample_classroom.id,
        subject_id=sample_subject.id,
        faculty_id=faculty_user.id,
        title="Test Lecture",
        scheduled_start=now - timedelta(minutes=2),
        scheduled_end=now + timedelta(minutes=58),
        late_start_offset=5,
        late_end_offset=15,
        status="active",
    )