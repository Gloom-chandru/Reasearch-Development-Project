"""Tests for attendance session lifecycle."""

import pytest
from datetime import datetime, timedelta


def test_create_session_as_faculty(client, faculty_user, sample_classroom, sample_subject, db):
    """Faculty can create sessions."""
    from app.utils.security import create_access_token
    token = create_access_token(data={"sub": faculty_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    now = datetime.utcnow()
    payload = {
        "classroom_id": sample_classroom.id,
        "subject_id": sample_subject.id,
        "title": "CS Lecture",
        "scheduled_start": (now + timedelta(minutes=5)).isoformat(),
        "scheduled_end": (now + timedelta(minutes=65)).isoformat(),
        "late_start_offset": 5,
        "late_end_offset": 15,
    }
    response = client.post("/api/sessions", json=payload, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "CS Lecture"
    assert body["status"] == "scheduled"


def test_create_session_invalid_classroom(client, auth_headers, sample_subject):
    """Non-existent classroom should 404."""
    now = datetime.utcnow()
    payload = {
        "classroom_id": 9999,
        "subject_id": sample_subject.id,
        "title": "x",
        "scheduled_start": now.isoformat(),
        "scheduled_end": (now + timedelta(hours=1)).isoformat(),
    }
    response = client.post("/api/sessions", json=payload, headers=auth_headers)
    assert response.status_code == 404


def test_create_session_bad_time_order(client, auth_headers, sample_classroom, sample_subject):
    """End before start should be 400."""
    now = datetime.utcnow()
    payload = {
        "classroom_id": sample_classroom.id,
        "subject_id": sample_subject.id,
        "title": "x",
        "scheduled_start": now.isoformat(),
        "scheduled_end": (now - timedelta(hours=1)).isoformat(),
    }
    response = client.post("/api/sessions", json=payload, headers=auth_headers)
    assert response.status_code == 400


def test_list_sessions(client, auth_headers, sample_session):
    """List returns the seeded active session."""
    response = client.get("/api/sessions", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert any(s["id"] == sample_session.id for s in body["sessions"])


def test_activate_then_complete_session(client, auth_headers, sample_classroom, sample_subject):
    """Full lifecycle: create → activate → complete."""
    now = datetime.utcnow()
    create_payload = {
        "classroom_id": sample_classroom.id,
        "subject_id": sample_subject.id,
        "title": "Lifecycle test",
        "scheduled_start": now.isoformat(),
        "scheduled_end": (now + timedelta(hours=1)).isoformat(),
    }
    create_resp = client.post("/api/sessions", json=create_payload, headers=auth_headers)
    assert create_resp.status_code == 200
    session_id = create_resp.json()["id"]

    # Activate
    activate = client.post(f"/api/sessions/{session_id}/activate", headers=auth_headers)
    assert activate.status_code == 200
    assert activate.json()["status"] == "active"

    # Complete
    complete = client.post(f"/api/sessions/{session_id}/complete", headers=auth_headers)
    assert complete.status_code == 200
    assert complete.json()["status"] == "completed"


def test_get_session_not_found(client, auth_headers):
    """Missing session is 404."""
    response = client.get("/api/sessions/99999", headers=auth_headers)
    assert response.status_code == 404


def test_create_subject_and_list(client, auth_headers):
    """Subject creation and listing works."""
    payload = {"name": "Math", "code": "MATH101", "department": "CSE"}
    create = client.post("/api/sessions/subjects", json=payload, headers=auth_headers)
    assert create.status_code == 200
    assert create.json()["code"] == "MATH101"

    listing = client.get("/api/sessions/subjects", headers=auth_headers)
    assert listing.status_code == 200
    assert any(s["code"] == "MATH101" for s in listing.json()["subjects"])
