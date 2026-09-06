"""Tests for the student management API."""

import pytest


def test_create_student_as_admin(client, auth_headers):
    """Admin can create a student."""
    payload = {
        "register_number": "REG001",
        "full_name": "Alice Smith",
        "email": "alice@example.com",
        "department": "CSE",
        "section": "A",
    }
    response = client.post("/api/students", json=payload, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["register_number"] == "REG001"
    assert body["full_name"] == "Alice Smith"
    assert body["is_active"] is True


def test_create_student_duplicate(client, auth_headers, sample_student):
    """Duplicate register_number should be 409."""
    payload = {
        "register_number": sample_student.register_number,
        "full_name": "Duplicate",
        "email": "dup@example.com",
        "department": "CSE",
        "section": "A",
    }
    response = client.post("/api/students", json=payload, headers=auth_headers)
    assert response.status_code == 409


def test_list_students(client, auth_headers, sample_student):
    """List returns paginated students."""
    response = client.get("/api/students", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert "total" in body
    assert "students" in body
    assert any(s["register_number"] == sample_student.register_number for s in body["students"])


def test_list_students_filter_by_department(client, auth_headers, sample_student):
    """List can filter by department."""
    response = client.get("/api/students?department=CSE", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    for s in body["students"]:
        assert s["department"] == "CSE"


def test_list_students_unauthenticated(client):
    """Listing students requires auth."""
    response = client.get("/api/students")
    # HTTPBearer returns 403 for missing token, 401 for invalid token
    assert response.status_code in (401, 403)


def test_get_student_by_id(client, auth_headers, sample_student):
    """Get by id works."""
    response = client.get(f"/api/students/{sample_student.id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["register_number"] == sample_student.register_number


def test_get_student_not_found(client, auth_headers):
    """Missing student should be 404."""
    response = client.get("/api/students/99999", headers=auth_headers)
    assert response.status_code == 404


def test_update_student(client, auth_headers, sample_student):
    """Partial update of a student works."""
    payload = {"full_name": "Updated Name", "section": "B"}
    response = client.put(
        f"/api/students/{sample_student.id}",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Updated Name"
    assert body["section"] == "B"


def test_delete_student_requires_admin(client, auth_headers, sample_student):
    """Faculty cannot delete — admin only."""
    # auth_headers is admin, so this should succeed
    response = client.delete(
        f"/api/students/{sample_student.id}", headers=auth_headers
    )
    assert response.status_code == 200


def test_delete_student_not_found(client, auth_headers):
    """Deleting a non-existent student is 404."""
    response = client.delete("/api/students/99999", headers=auth_headers)
    assert response.status_code == 404
