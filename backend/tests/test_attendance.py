"""Tests for attendance recording and correction."""

import pytest
from datetime import datetime, timedelta


def test_record_attendance_present(client, auth_headers, sample_session, sample_student):
    """Recording present status for an active session."""
    payload = {
        "student_id": sample_student.id,
        "session_id": sample_session.id,
        "recognition_decision": "match",
        "similarity_score": 0.92,
        "quality_label": "GOOD",
        "entry_zone_result": "inside",
        "liveness_result": "live",
    }
    response = client.post(
        "/api/sessions/attendance/record",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] in ("present", "late")
    assert body["student_id"] == sample_student.id


def test_record_attendance_inactive_session(client, auth_headers, sample_student, sample_classroom, sample_subject):
    """Recording attendance on a scheduled (not yet active) session should fail."""
    from app.repositories.repository_sessions import AttendanceSessionRepository
    from tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    try:
        now = datetime.utcnow()
        session = AttendanceSessionRepository(db).create(
            classroom_id=sample_classroom.id,
            subject_id=sample_subject.id,
            title="Future lecture",
            scheduled_start=now + timedelta(hours=1),
            scheduled_end=now + timedelta(hours=2),
            status="scheduled",
        )
        session_id = session.id
    finally:
        db.close()

    payload = {
        "student_id": sample_student.id,
        "session_id": session_id,
        "recognition_decision": "match",
    }
    response = client.post(
        "/api/sessions/attendance/record",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 400, response.text


def test_get_session_attendance_empty(client, auth_headers, sample_session):
    """Get attendance for a session with no records."""
    response = client.get(
        f"/api/sessions/{sample_session.id}/attendance",
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 0
    assert body["present"] == 0
    assert body["late"] == 0
    assert body["absent"] == 0
    assert body["records"] == []


def test_get_session_attendance_with_records(client, auth_headers, sample_session, sample_student):
    """When records exist, they're returned with student info."""
    # First create a record via the API (so it goes through the same session)
    payload = {
        "student_id": sample_student.id,
        "session_id": sample_session.id,
        "recognition_decision": "match",
        "similarity_score": 0.91,
    }
    create = client.post(
        "/api/sessions/attendance/record",
        json=payload,
        headers=auth_headers,
    )
    assert create.status_code == 200

    response = client.get(
        f"/api/sessions/{sample_session.id}/attendance",
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert any(
        r["student_register_number"] == sample_student.register_number
        for r in body["records"]
    )


def test_correct_attendance_record(client, auth_headers, sample_session, sample_student):
    """Correction flow updates the record and creates an audit entry."""
    payload = {
        "student_id": sample_student.id,
        "session_id": sample_session.id,
        "recognition_decision": "match",
    }
    create = client.post(
        "/api/sessions/attendance/record",
        json=payload,
        headers=auth_headers,
    )
    assert create.status_code == 200
    record_id = create.json()["id"]

    payload = {
        "record_id": record_id,
        "new_status": "manual",
        "reason": "Student showed up after camera failure",
    }
    response = client.post(
        "/api/sessions/attendance/correct",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["is_corrected"] is True
    assert body["status"] == "manual"
    assert body["corrected_by"] is not None
