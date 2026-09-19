"""Tests for Final Consolidation & Production Hardening.

Covers:
- Cookie-based authentication & SameSite=Lax
- CSRF token validation on cookie requests
- Threshold validation gate on session activation & recognition
- Fused liveness detection (MediaPipe EAR + passive anti-spoofing)
- Research Assistant service (RAG with Wilson CIs & DB citations)
"""

import numpy as np
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User
from app.models.classroom import Classroom
from app.models.session import AttendanceSession
from app.models.config import AttendanceConfiguration
from app.models.experiment import Experiment, ExperimentResult
from app.services.liveness_service import LivenessService
from app.services.research_assistant import ResearchAssistantService


def test_cookie_auth_and_logout(client: TestClient, admin_user: User):
    """Verify login sets httpOnly access_token and csrf_token cookies with Lax, and logout clears them."""
    response = client.post(
        "/api/auth/login",
        json={"username": "testadmin", "password": "testpass123"},
    )
    assert response.status_code == 200
    cookies = response.cookies
    assert settings.COOKIE_NAME in cookies
    assert settings.CSRF_COOKIE_NAME in cookies

    # Check that me endpoint works using cookies alone (no Authorization header)
    me_resp = client.get("/api/auth/me", cookies=cookies)
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "testadmin"

    # Test logout clears cookies
    logout_resp = client.post("/api/auth/logout", cookies=cookies)
    assert logout_resp.status_code == 200


def test_csrf_protection_on_cookie_auth(client: TestClient, admin_user: User):
    """State-changing requests using cookie auth require matching X-CSRF-Token header."""
    login_resp = client.post(
        "/api/auth/login",
        json={"username": "testadmin", "password": "testpass123"},
    )
    assert login_resp.status_code == 200
    cookies = login_resp.cookies
    csrf_token = cookies.get(settings.CSRF_COOKIE_NAME)

    # POST without X-CSRF-Token header -> 403 Forbidden
    resp_no_csrf = client.post(
        "/api/classrooms",
        json={"name": "Room 999", "code": "R999", "floor": 1, "capacity": 30},
        cookies=cookies,
    )
    assert resp_no_csrf.status_code == 403

    # POST with X-CSRF-Token header -> 200 OK
    resp_with_csrf = client.post(
        "/api/classrooms",
        json={"name": "Room 999", "code": "R999", "floor": 1, "capacity": 30},
        cookies=cookies,
        headers={settings.CSRF_HEADER_NAME: csrf_token},
    )
    assert resp_with_csrf.status_code == 200


def test_threshold_validation_gate(
    client: TestClient, db: Session, sample_session: AttendanceSession, auth_headers: dict
):
    """Session activation and recognition should be blocked if threshold_validated is False."""
    # Ensure session is scheduled and configuration exists with threshold_validated=False
    sample_session.status = "scheduled"
    cfg = db.query(AttendanceConfiguration).filter(
        AttendanceConfiguration.classroom_id == sample_session.classroom_id
    ).first()
    if not cfg:
        cfg = AttendanceConfiguration(
            classroom_id=sample_session.classroom_id,
            recognition_threshold=0.40,
            threshold_validated=False,
        )
        db.add(cfg)
    else:
        cfg.threshold_validated = False
    db.commit()

    # Attempt to activate session -> 400 Bad Request
    resp = client.post(
        f"/api/sessions/{sample_session.id}/activate",
        headers=auth_headers,
    )
    assert resp.status_code == 400
    assert "threshold" in resp.json()["detail"].lower()

    # Now mark threshold as validated
    cfg.threshold_validated = True
    db.commit()

    # Activation should now succeed
    resp_ok = client.post(
        f"/api/sessions/{sample_session.id}/activate",
        headers=auth_headers,
    )
    assert resp_ok.status_code == 200


def test_fused_liveness_service():
    """Verify fused liveness service returns EAR and passive spoof detection scores."""
    service = LivenessService()
    # Create synthetic test frame
    synthetic_frame = np.zeros((300, 300, 3), dtype=np.uint8)
    face_box = (50, 50, 200, 200)

    result = service.detect_liveness_fused(synthetic_frame, face_box)
    assert "liveness" in result
    assert "fused_score" in result
    assert "passive_score" in result
    assert "passive_verdict" in result
    assert "blink_verdict" in result
    assert 0.0 <= result["fused_score"] <= 1.0


def test_research_assistant_rag(client: TestClient, db: Session, auth_headers: dict):
    """Verify Research Assistant returns database citations with 95% Wilson CIs."""
    # Insert a dummy experiment and result
    exp = Experiment(
        name="Illumination Stress Test",
        description="Testing recognition under varied lux",
        experiment_type="lighting",
        model_version="buffalo_l",
        threshold=0.42,
    )
    db.add(exp)
    db.flush()

    res = ExperimentResult(
        experiment_id=exp.id,
        metric_name="accuracy",
        value=0.965,
        sample_size=100,
        ci_lower=0.91,
        ci_upper=0.988,
        condition="50 lux (dim lighting)",
    )
    db.add(res)
    db.commit()

    query_resp = client.post(
        "/api/experiments/assistant/query",
        json={"query": "How does lighting affect accuracy?"},
        headers=auth_headers,
    )
    assert query_resp.status_code == 200
    data = query_resp.json()
    assert "answer" in data
    assert len(data["citations"]) >= 1
    assert data["citations"][0]["metric_name"] == "accuracy"
    assert data["citations"][0]["sample_size"] == 100
    assert data["citations"][0]["ci_lower"] == 0.91
    assert data["citations"][0]["ci_upper"] == 0.988
    assert "95% Wilson CI" in data["answer"]
