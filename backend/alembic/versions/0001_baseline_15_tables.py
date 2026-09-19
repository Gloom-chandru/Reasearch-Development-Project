"""Baseline 15-table schema with threshold_validated

Revision ID: 0001_baseline
Revises: 
Create Date: 2026-09-19 11:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("username", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("email", sa.String(120), unique=True, nullable=False, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, default="faculty"),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # 2. students
    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("register_number", sa.String(30), unique=True, nullable=False, index=True),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(120), unique=True, nullable=True),
        sa.Column("department", sa.String(60), nullable=False),
        sa.Column("section", sa.String(10), nullable=False),
        sa.Column("batch_year", sa.Integer(), nullable=True),
        sa.Column("enrollment_count", sa.Integer(), default=0),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # 3. classrooms
    op.create_table(
        "classrooms",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("code", sa.String(20), unique=True, nullable=False, index=True),
        sa.Column("floor", sa.Integer(), nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("entry_zone_x1", sa.Float(), default=0.2),
        sa.Column("entry_zone_y1", sa.Float(), default=0.2),
        sa.Column("entry_zone_x2", sa.Float(), default=0.8),
        sa.Column("entry_zone_y2", sa.Float(), default=0.8),
        sa.Column("is_active", sa.Boolean(), default=True),
    )

    # 4. subjects
    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("code", sa.String(20), unique=True, nullable=False, index=True),
        sa.Column("department", sa.String(60), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True),
    )

    # 5. face_embeddings
    op.create_table(
        "face_embeddings",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("embedding", sa.LargeBinary(), nullable=False),
        sa.Column("dimension", sa.Integer(), default=512),
        sa.Column("quality_label", sa.String(20), default="GOOD"),
        sa.Column("quality_reason", sa.String(255), nullable=True),
        sa.Column("capture_index", sa.Integer(), default=0),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # 6. classroom_enrollments
    op.create_table(
        "classroom_enrollments",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("classroom_id", sa.Integer(), sa.ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("enrolled_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("student_id", "classroom_id", "subject_id", name="uq_student_classroom_subject"),
    )

    # 7. attendance_configurations
    op.create_table(
        "attendance_configurations",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("classroom_id", sa.Integer(), sa.ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=True, index=True),
        sa.Column("section", sa.String(20), nullable=True),
        sa.Column("recognition_threshold", sa.Float(), nullable=True),
        sa.Column("min_face_size", sa.Integer(), nullable=True),
        sa.Column("blur_threshold", sa.Float(), nullable=True),
        sa.Column("late_start_offset", sa.Integer(), nullable=True),
        sa.Column("late_end_offset", sa.Integer(), nullable=True),
        sa.Column("entry_zone_enabled", sa.Boolean(), default=True),
        sa.Column("liveness_enabled", sa.Boolean(), default=False),
        sa.Column("threshold_validated", sa.Boolean(), default=False),
        sa.Column("is_active", sa.Boolean(), default=True),
    )

    # 8. attendance_sessions
    op.create_table(
        "attendance_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("classroom_id", sa.Integer(), sa.ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("scheduled_start", sa.DateTime(), nullable=False),
        sa.Column("scheduled_end", sa.DateTime(), nullable=False),
        sa.Column("actual_start", sa.DateTime(), nullable=True),
        sa.Column("actual_end", sa.DateTime(), nullable=True),
        sa.Column("late_start_offset", sa.Integer(), default=5),
        sa.Column("status", sa.String(20), default="scheduled", index=True),
        sa.Column("total_expected", sa.Integer(), default=0),
        sa.Column("total_present", sa.Integer(), default=0),
        sa.Column("total_late", sa.Integer(), default=0),
        sa.Column("total_absent", sa.Integer(), default=0),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # 9. attendance_records
    op.create_table(
        "attendance_records",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("entry_time", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("recognition_decision", sa.String(20), nullable=True),
        sa.Column("similarity_score", sa.Float(), nullable=True),
        sa.Column("quality_label", sa.String(20), nullable=True),
        sa.Column("entry_zone_result", sa.String(20), nullable=True),
        sa.Column("liveness_result", sa.String(20), nullable=True),
        sa.Column("is_corrected", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("session_id", "student_id", name="uq_session_student"),
    )

    # 10. corrections
    op.create_table(
        "corrections",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("attendance_record_id", sa.Integer(), sa.ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("corrected_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("previous_status", sa.String(20), nullable=False),
        sa.Column("new_status", sa.String(20), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # 11. notices
    op.create_table(
        "notices",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("classroom_id", sa.Integer(), sa.ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=True, index=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("priority", sa.Integer(), default=0),
        sa.Column("valid_from", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("valid_until", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # 12. audit_logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("action", sa.String(80), nullable=False, index=True),
        sa.Column("entity_type", sa.String(40), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), index=True),
    )

    # 13. system_events
    op.create_table(
        "system_events",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("source", sa.String(60), nullable=False, index=True),
        sa.Column("level", sa.String(20), nullable=False, default="info"),
        sa.Column("message", sa.String(255), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), index=True),
    )

    # 14. experiments
    op.create_table(
        "experiments",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("experiment_type", sa.String(40), nullable=False, index=True),
        sa.Column("configuration", sa.Text(), nullable=True),
        sa.Column("model_version", sa.String(40), nullable=True),
        sa.Column("threshold", sa.Float(), nullable=True),
        sa.Column("dataset_label", sa.String(80), nullable=True),
        sa.Column("participant_count", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # 15. experiment_results
    op.create_table(
        "experiment_results",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("experiment_id", sa.Integer(), sa.ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("metric_name", sa.String(60), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("ci_lower", sa.Float(), nullable=True),
        sa.Column("ci_upper", sa.Float(), nullable=True),
        sa.Column("sample_size", sa.Integer(), nullable=False),
        sa.Column("condition", sa.String(80), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    for tbl in [
        "experiment_results",
        "experiments",
        "system_events",
        "audit_logs",
        "notices",
        "corrections",
        "attendance_records",
        "attendance_sessions",
        "attendance_configurations",
        "classroom_enrollments",
        "face_embeddings",
        "subjects",
        "classrooms",
        "students",
        "users",
    ]:
        op.drop_table(tbl)
