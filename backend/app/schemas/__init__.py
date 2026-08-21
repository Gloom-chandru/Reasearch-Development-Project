"""Pydantic schemas — request/response models for all API endpoints."""

from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    TokenRefreshRequest,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.schemas.student import (
    StudentCreate,
    StudentResponse,
    StudentListResponse,
    StudentUpdate,
)
from app.schemas.session import (
    SessionCreate,
    SessionResponse,
    SessionListResponse,
    SessionUpdate,
)
from app.schemas.attendance import (
    AttendanceRecordResponse,
    AttendanceListResponse,
    AttendanceCorrectionRequest,
)
from app.schemas.classroom import (
    ClassroomCreate,
    ClassroomResponse,
    ClassroomListResponse,
)
from app.schemas.notice import (
    NoticeCreate,
    NoticeResponse,
    NoticeListResponse,
)
from app.schemas.experiment import (
    ExperimentCreate,
    ExperimentResponse,
    ExperimentResultCreate,
    ExperimentResultResponse,
)

__all__ = [
    "LoginRequest",
    "LoginResponse",
    "TokenRefreshRequest",
    "UserCreate",
    "UserResponse",
    "UserUpdate",
    "StudentCreate",
    "StudentResponse",
    "StudentListResponse",
    "StudentUpdate",
    "SessionCreate",
    "SessionResponse",
    "SessionListResponse",
    "SessionUpdate",
    "AttendanceRecordResponse",
    "AttendanceListResponse",
    "AttendanceCorrectionRequest",
    "ClassroomCreate",
    "ClassroomResponse",
    "ClassroomListResponse",
    "NoticeCreate",
    "NoticeResponse",
    "NoticeListResponse",
    "ExperimentCreate",
    "ExperimentResponse",
    "ExperimentResultCreate",
    "ExperimentResultResponse",
]