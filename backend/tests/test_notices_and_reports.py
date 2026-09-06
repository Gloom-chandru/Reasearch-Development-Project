"""Tests for notice management and Excel reporting endpoints."""

import pytest


def test_create_notice_as_faculty(client, faculty_user, auth_token, db):
    """Faculty can create notices."""
    from app.utils.security import create_access_token
    token = create_access_token(data={"sub": faculty_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Class cancelled",
        "body": "Today's class is cancelled due to faculty meeting.",
        "priority": 1,
    }
    response = client.post("/api/notices", json=payload, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Class cancelled"
    assert body["priority"] == 1


def test_get_active_notices(client, sample_classroom):
    """Active notices endpoint is publicly accessible."""
    response = client.get("/api/notices/active")
    assert response.status_code == 200
    body = response.json()
    assert "total" in body
    assert "notices" in body


def test_list_notices_requires_auth(client):
    """Listing all notices requires auth."""
    response = client.get("/api/notices")
    # HTTPBearer returns 403 for missing token, 401 for invalid token
    assert response.status_code in (401, 403)


def test_get_notice_not_found(client, auth_headers):
    """Missing notice is 404."""
    response = client.get("/api/notices/99999", headers=auth_headers)
    assert response.status_code == 404


def test_deactivate_notice(client, auth_headers, sample_classroom, faculty_user):
    """Deactivate marks a notice as inactive."""
    from app.utils.security import create_access_token
    token = create_access_token(data={"sub": faculty_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"title": "Tmp", "body": "x", "priority": 0}
    create = client.post("/api/notices", json=payload, headers=headers)
    notice_id = create.json()["id"]

    response = client.post(
        f"/api/notices/{notice_id}/deactivate",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False


# ── Reports ────────────────────────────────────────────────────────

def test_session_report_excel_download(client, auth_headers, sample_session):
    """Excel report for an empty session is a valid xlsx (200)."""
    response = client.get(
        f"/api/reports/session/{sample_session.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert len(response.content) > 0


def test_session_report_not_found(client, auth_headers):
    """Missing session for report is 404."""
    response = client.get("/api/reports/session/99999", headers=auth_headers)
    assert response.status_code == 404


def test_student_report_excel_download(client, auth_headers, sample_student):
    """Excel report for a student is a valid xlsx (200)."""
    response = client.get(
        f"/api/reports/student/{sample_student.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert len(response.content) > 0


def test_student_report_not_found(client, auth_headers):
    """Missing student for report is 404."""
    response = client.get("/api/reports/student/99999", headers=auth_headers)
    assert response.status_code == 404
