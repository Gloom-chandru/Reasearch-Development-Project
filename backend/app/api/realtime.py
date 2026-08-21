"""WebSocket endpoint — real-time classroom display connections.

Also provides a REST endpoint for submitting camera frames for recognition.
"""

from __future__ import annotations

import json
import datetime
from typing import Optional

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.classroom import Classroom
from app.repositories.repository_sessions import (
    ClassroomRepository,
    AttendanceSessionRepository,
)
from app.services.websocket_manager import manager
from app.services.camera_pipeline import CameraPipeline
from app.utils.logging import logger

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/classroom/{classroom_id}")
async def classroom_websocket(websocket: WebSocket, classroom_id: int):
    """WebSocket endpoint for real-time classroom display.

    Clients connect to receive attendance events and session state updates.
    """
    await manager.connect(websocket, classroom_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # Handle client messages (e.g., heartbeat, auth)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, classroom_id)
    except Exception as e:
        logger.warning(f"WebSocket error for classroom={classroom_id}: {e}")
        manager.disconnect(websocket, classroom_id)


@router.post("/recognize/{classroom_id}")
async def recognize_frame(
    classroom_id: int,
    image_data: str = Form(...),
    session_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    """Receive a camera frame and run it through the recognition pipeline.

    Args:
        classroom_id: Physical classroom ID
        image_data: Base64-encoded JPEG from webcam
        session_id: Active attendance session ID (optional, auto-detected if not provided)

    Returns:
        Pipeline results for all detected faces
    """
    import base64

    # Decode image
    try:
        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"error": "Failed to decode image"}
    except Exception as e:
        return {"error": f"Invalid image: {e}"}

    # Get classroom
    classroom_repo = ClassroomRepository(db)
    classroom = classroom_repo.get(classroom_id)
    if not classroom:
        return {"error": "Classroom not found"}

    # Auto-detect active session if not provided
    if session_id is None:
        session_repo = AttendanceSessionRepository(db)
        sessions = session_repo.get_active_sessions()
        matching = [s for s in sessions if s.classroom_id == classroom_id]
        if not matching:
            return {"error": "No active session for this classroom"}
        session_id = matching[0].id

    # Run pipeline
    pipeline = CameraPipeline(db)
    pipeline._init_db_services(db)
    pipeline.configure(classroom)

    results = pipeline.process_frame(frame, session_id)

    return {
        "face_count": len(results),
        "timestamp": str(datetime.datetime.utcnow()),
        "results": [r.to_dict() for r in results],
    }