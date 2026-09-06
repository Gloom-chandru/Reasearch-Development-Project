"""WebSocket endpoint — real-time classroom display connections.

Also provides a REST endpoint for submitting camera frames for recognition.

WebSocket Authentication
------------------------
The WebSocket endpoint at /ws/classroom/{classroom_id} requires token-based
authentication:

  1. Client opens the WebSocket connection.
  2. Client sends {"type": "auth", "token": "<JWT>"} as the FIRST message,
     within WS_AUTH_TIMEOUT_SECONDS seconds.
  3. Server validates the token:
     - Valid  → sends {"type": "auth_ok", "user": "<username>"} and keeps connection.
     - Invalid / timeout → sends {"type": "auth_error", "detail": "..."} and closes.
  4. After successful auth, normal message handling continues.

The classroom display page (ClassroomDisplay.jsx) and the WebSocketContext
factory already send this auth frame on open.
"""

from __future__ import annotations

import asyncio
import base64
import datetime
import json
from typing import Optional

import cv2
import numpy as np
from fastapi import APIRouter, Depends, Form, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.utils.dependencies import get_current_user, require_role
from app.utils.security import decode_access_token
from app.models.user import User
from app.repositories.repository_sessions import (
    AttendanceSessionRepository,
    ClassroomRepository,
)
from app.services.camera_pipeline import CameraPipeline
from app.services.websocket_manager import manager
from app.utils.logging import logger

router = APIRouter(prefix="/ws", tags=["websocket"])

# Maximum seconds a client has to send its auth token after connecting
WS_AUTH_TIMEOUT_SECONDS = 5


async def _authenticate_websocket(websocket: WebSocket) -> Optional[User]:
    """Wait for the client auth frame and validate the JWT.

    Returns the authenticated User on success, or None on failure/timeout.
    Sends auth_ok / auth_error back to the client.
    """
    try:
        raw = await asyncio.wait_for(
            websocket.receive_text(),
            timeout=WS_AUTH_TIMEOUT_SECONDS,
        )
        msg = json.loads(raw)
    except asyncio.TimeoutError:
        await websocket.send_text(json.dumps({
            "type": "auth_error",
            "detail": f"Authentication timeout — send {{\"type\":\"auth\",\"token\":\"<JWT>\"}} within {WS_AUTH_TIMEOUT_SECONDS}s",
        }))
        return None
    except Exception:
        await websocket.send_text(json.dumps({
            "type": "auth_error",
            "detail": "Invalid message format — expected JSON",
        }))
        return None

    if msg.get("type") != "auth" or not msg.get("token"):
        await websocket.send_text(json.dumps({
            "type": "auth_error",
            "detail": 'First message must be {"type":"auth","token":"<JWT>"}',
        }))
        return None

    payload = decode_access_token(msg["token"])
    if payload is None:
        await websocket.send_text(json.dumps({
            "type": "auth_error",
            "detail": "Invalid or expired token",
        }))
        return None

    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        await websocket.send_text(json.dumps({
            "type": "auth_error",
            "detail": "Malformed token payload",
        }))
        return None

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    finally:
        db.close()

    if user is None:
        await websocket.send_text(json.dumps({
            "type": "auth_error",
            "detail": "User not found or inactive",
        }))
        return None

    await websocket.send_text(json.dumps({
        "type": "auth_ok",
        "user": user.username,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
    }))
    logger.info(f"WS authenticated: user={user.username} classroom_id from path")
    return user


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@router.websocket("/classroom/{classroom_id}")
async def classroom_websocket(websocket: WebSocket, classroom_id: int):
    """Authenticated WebSocket for real-time classroom display.

    Protocol:
      1. Connect
      2. Send {"type":"auth","token":"<JWT>"} immediately
      3. Receive {"type":"auth_ok"} or {"type":"auth_error"} + close
      4. Receive attendance_confirmed / session_state / led_event events
      5. Send {"type":"ping"} to keep alive; receive {"type":"pong"}
    """
    await websocket.accept()

    # ── Authentication ──────────────────────────────────────────────
    user = await _authenticate_websocket(websocket)
    if user is None:
        await websocket.close(code=4001)
        return

    # ── Register and serve ─────────────────────────────────────────
    await manager.connect(websocket, classroom_id, skip_accept=True)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, classroom_id)
    except Exception as e:
        logger.warning(f"WebSocket error for classroom={classroom_id}: {e}")
        manager.disconnect(websocket, classroom_id)


# ── REST frame submission endpoint ────────────────────────────────────────────

@router.post("/recognize/{classroom_id}")
async def recognize_frame(
    classroom_id: int,
    image_data: str = Form(...),
    session_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "hod", "coordinator", "faculty")),
):
    """Receive a camera frame and run it through the recognition pipeline.

    Args:
        classroom_id: Physical classroom ID
        image_data:   Base64-encoded JPEG from webcam
        session_id:   Active attendance session (auto-detected if omitted)

    Returns:
        Pipeline results for all detected faces
    """
    # Decode image
    try:
        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"error": "Failed to decode image — ensure base64 JPEG is valid"}
    except Exception as e:
        return {"error": f"Invalid image: {e}"}

    # Get classroom
    classroom_repo = ClassroomRepository(db)
    classroom = classroom_repo.get(classroom_id)
    if not classroom:
        return {"error": f"Classroom {classroom_id} not found"}

    # Auto-detect active session
    if session_id is None:
        session_repo = AttendanceSessionRepository(db)
        active = [s for s in session_repo.get_active_sessions() if s.classroom_id == classroom_id]
        if not active:
            return {"error": "No active session for this classroom"}
        session_id = active[0].id

    # Run pipeline
    pipeline = CameraPipeline(db)
    pipeline._init_db_services(db)
    pipeline.configure(classroom)

    results = pipeline.process_frame(frame, session_id)

    return {
        "face_count": len(results),
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "results": [r.to_dict() for r in results],
    }
