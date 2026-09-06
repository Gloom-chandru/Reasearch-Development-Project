"""WebSocket manager — handles real-time classroom display connections.

Broadcasts attendance events and session state to connected classroom displays.
"""

from __future__ import annotations

import datetime
import json
import asyncio
from typing import Dict, Set, Optional
from fastapi import WebSocket
from app.utils.logging import logger


class ConnectionManager:
    """Manages WebSocket connections for real-time classroom display."""

    def __init__(self):
        # classroom_id -> set of WebSocket connections
        self._connections: Dict[int, Set[WebSocket]] = {}
        self._active_sessions: Dict[int, int] = {}  # classroom_id -> session_id

    async def connect(self, websocket: WebSocket, classroom_id: int, skip_accept: bool = False) -> None:
        """Accept a WebSocket connection and register it for a classroom.

        Args:
            skip_accept: If True, skip websocket.accept() (already called before auth).
        """
        if not skip_accept:
            await websocket.accept()
        if classroom_id not in self._connections:
            self._connections[classroom_id] = set()
        self._connections[classroom_id].add(websocket)
        logger.info(f"WebSocket client connected for classroom={classroom_id}")

    def disconnect(self, websocket: WebSocket, classroom_id: int) -> None:
        """Remove a WebSocket connection."""
        if classroom_id in self._connections:
            self._connections[classroom_id].discard(websocket)
            if not self._connections[classroom_id]:
                del self._connections[classroom_id]
        logger.info(f"WebSocket client disconnected for classroom={classroom_id}")

    def set_active_session(self, classroom_id: int, session_id: int) -> None:
        """Record the active session for a classroom."""
        self._active_sessions[classroom_id] = session_id

    def clear_active_session(self, classroom_id: int) -> None:
        """Remove the active session record."""
        self._active_sessions.pop(classroom_id, None)

    def get_active_session(self, classroom_id: int) -> Optional[int]:
        """Get the active session ID for a classroom."""
        return self._active_sessions.get(classroom_id)

    async def broadcast(
        self, classroom_id: int, message: dict
    ) -> int:
        """Broadcast a message to all connections for a classroom.

        Returns the number of connections the message was sent to.
        """
        if classroom_id not in self._connections:
            return 0

        disconnected = set()
        payload = json.dumps(message)
        count = 0

        for ws in self._connections[classroom_id]:
            try:
                await ws.send_text(payload)
                count += 1
            except Exception:
                disconnected.add(ws)

        for ws in disconnected:
            self._connections[classroom_id].discard(ws)

        if disconnected and not self._connections[classroom_id]:
            del self._connections[classroom_id]

        return count

    async def broadcast_attendance_event(
        self,
        classroom_id: int,
        student_name: str,
        status: str,
        similarity: Optional[float] = None,
        decision: Optional[str] = None,
    ) -> int:
        """Broadcast an attendance confirmation event."""
        return await self.broadcast(classroom_id, {
            "type": "attendance_confirmed",
            "student_name": student_name,
            "status": status,
            "similarity_score": similarity,
            "recognition_decision": decision,
            "timestamp": str(datetime.datetime.utcnow()),
        })

    async def broadcast_session_state(
        self,
        classroom_id: int,
        session_id: int = None,
        status: str = None,
        title: str = None,
        **kwargs,
    ) -> int:
        """Broadcast session lifecycle state (active, completed, etc.)."""
        payload = {
            "type": "session_state",
            "timestamp": str(datetime.datetime.utcnow()),
        }
        if session_id is not None:
            payload["session_id"] = session_id
        if status is not None:
            payload["status"] = status
        if title is not None:
            payload["title"] = title
        payload.update(kwargs)
        return await self.broadcast(classroom_id, payload)


# Global singleton
manager = ConnectionManager()