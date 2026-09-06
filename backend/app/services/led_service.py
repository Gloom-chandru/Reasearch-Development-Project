"""LED / IoT notification service.

SIMULATION NOTE
---------------
Physical hardware (ESP32 + LED over MQTT/HTTP) is documented as a future-work
item in §11 of the master project spec.  This module provides a software-
simulated equivalent that:
  - Logs every LED event to the system_event table so the effect is visible
    in the audit trail
  - Broadcasts a "led_event" WebSocket message so the classroom display can
    show a simulated LED indicator
  - Optionally publishes to an MQTT broker if LED_ENABLED=true and the
    paho-mqtt package is available

This simulation is clearly NOT physical hardware.  Any report or demo must
state: "LED indicator is software-simulated; physical ESP32 integration is
deferred to production deployment."
"""

from __future__ import annotations

import json
from typing import Optional

from app.config import settings
from app.utils.logging import logger


class LEDState:
    """Named LED states used across the system."""
    PRESENT = "present"    # green flash
    LATE = "late"          # yellow flash
    UNKNOWN = "unknown"    # red flash
    IDLE = "idle"          # off


def _try_mqtt_publish(topic: str, payload: str) -> bool:
    """Attempt to publish to MQTT broker.  Returns True on success."""
    try:
        import paho.mqtt.publish as publish
        publish.single(
            topic=topic,
            payload=payload,
            hostname=settings.MQTT_BROKER,
            port=settings.MQTT_PORT,
        )
        return True
    except ImportError:
        logger.debug("paho-mqtt not installed — MQTT publish skipped")
    except Exception as e:
        logger.warning(f"MQTT publish failed: {e}")
    return False


def trigger_led(
    state: str,
    student_name: str = "",
    classroom_id: int = 0,
    db=None,
) -> dict:
    """Trigger an LED event.

    In simulation mode: logs + WebSocket broadcast.
    If LED_ENABLED=True: also publishes to MQTT.

    Args:
        state: One of LEDState.* constants
        student_name: Name of student who triggered the event
        classroom_id: Target classroom
        db: SQLAlchemy Session (optional — used for system event logging)

    Returns:
        {"state": state, "simulated": bool, "mqtt_sent": bool}
    """
    payload = json.dumps({
        "state": state,
        "student": student_name,
        "classroom_id": classroom_id,
    })

    mqtt_sent = False
    simulated = True

    if settings.LED_ENABLED:
        if settings.LED_MODE == "mqtt":
            mqtt_sent = _try_mqtt_publish(settings.MQTT_TOPIC, payload)
        simulated = not mqtt_sent

    if simulated:
        logger.info(
            f"[LED SIMULATION] state={state} student='{student_name}' "
            f"classroom={classroom_id} — "
            f"(physical hardware not connected; software simulation only)"
        )

    # Log to system_events table if DB session provided
    if db is not None:
        try:
            from app.repositories.repository_logging import SystemEventRepository
            SystemEventRepository(db).create(
                source="led_service",
                level="info",
                message=f"LED {state.upper()} — {student_name}",
                details=payload,
            )
        except Exception as e:
            logger.warning(f"LED system event write failed: {e}")

    # Broadcast simulated LED state over WebSocket
    try:
        import asyncio
        from app.services.websocket_manager import manager

        async def _broadcast():
            await manager.broadcast(classroom_id, {
                "type": "led_event",
                "state": state,
                "student_name": student_name,
                "simulated": simulated,
            })

        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(_broadcast())
        else:
            loop.run_until_complete(_broadcast())
    except Exception as e:
        logger.debug(f"LED WebSocket broadcast failed: {e}")

    return {"state": state, "simulated": simulated, "mqtt_sent": mqtt_sent}


def trigger_attendance_led(
    status: str,
    student_name: str = "",
    classroom_id: int = 0,
    db=None,
) -> dict:
    """Convenience wrapper: map attendance status → LED state."""
    mapping = {
        "present": LEDState.PRESENT,
        "late": LEDState.LATE,
        "unknown": LEDState.UNKNOWN,
        "low_confidence": LEDState.UNKNOWN,
    }
    led_state = mapping.get(status, LEDState.IDLE)
    return trigger_led(led_state, student_name, classroom_id, db)
