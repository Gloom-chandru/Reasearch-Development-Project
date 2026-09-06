"""Tests for the authentication flow."""

import pytest


def test_health_check(client):
    """Health endpoint should always be reachable."""
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert "version" in body


def test_login_success(client, admin_user):
    """Valid admin credentials should return a token."""
    response = client.post(
        "/api/auth/login",
        json={"username": "testadmin", "password": "testpass123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["username"] == "testadmin"
    assert body["user"]["role"] == "super_admin"


def test_login_wrong_password(client, admin_user):
    """Wrong password should be 401."""
    response = client.post(
        "/api/auth/login",
        json={"username": "testadmin", "password": "wrong"},
    )
    assert response.status_code == 401
    assert "Invalid" in response.json()["detail"]


def test_login_unknown_user(client):
    """Unknown username should be 401."""
    response = client.post(
        "/api/auth/login",
        json={"username": "ghost", "password": "x"},
    )
    assert response.status_code == 401


def test_get_me_authenticated(client, auth_headers, admin_user):
    """Authenticated /me should return current user."""
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["username"] == "testadmin"


def test_get_me_unauthenticated(client):
    """/me without token should be 401 or 403 (HTTPBearer returns 403)."""
    response = client.get("/api/auth/me")
    # FastAPI's HTTPBearer returns 403 when the Authorization header is
    # missing entirely (and 401 when the token is malformed/invalid).
    assert response.status_code in (401, 403)


def test_list_users_requires_auth(client):
    """Listing users requires authentication."""
    response = client.get("/api/auth/users")
    assert response.status_code in (401, 403)


def test_list_users_as_admin(client, auth_headers, admin_user):
    """Admin can list users."""
    response = client.get("/api/auth/users", headers=auth_headers)
    assert response.status_code == 200
    users = response.json()
    assert isinstance(users, list)
    assert any(u["username"] == "testadmin" for u in users)


def test_create_user_as_admin(client, auth_headers):
    """Admin can create new users."""
    payload = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "newpass123",
        "full_name": "New User",
        "role": "faculty",
    }
    response = client.post("/api/auth/users", json=payload, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "newuser"
    assert body["role"] == "faculty"


def test_create_user_duplicate(client, auth_headers, admin_user):
    """Duplicate username should be 409."""
    payload = {
        "username": "testadmin",
        "email": "other@example.com",
        "password": "xpass123",
        "full_name": "Other",
        "role": "faculty",
    }
    response = client.post("/api/auth/users", json=payload, headers=auth_headers)
    assert response.status_code == 409


def test_create_user_invalid_role(client, auth_headers):
    """Invalid role should be 400."""
    payload = {
        "username": "newalien",
        "email": "alien@example.com",
        "password": "xpass123",
        "full_name": "Alien",
        "role": "alien",
    }
    response = client.post("/api/auth/users", json=payload, headers=auth_headers)
    assert response.status_code == 400
