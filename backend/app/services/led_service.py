"""LED / IoT notification service.

Supports both:
1. Software Simulation (default):
   - Broadcasts 'led_event' over WebSocket to the Classroom Display kiosk
   - Logs events to system_events table in the database
2. Real ESP32 Hardware Integration via MQTT:
   - When LED_ENABLED=true in configuration, connects to MQTT broker and publishes
     events to classroom/{classroom_id}/led or MQTT_TOPIC.
   - ESP32 microcontrollers subscribed to the topic drive physical RGB/status LEDs.
   - Clean no-op / simulation fallback when disabled or unreachable.
"""

from __future__ import annotations

import datetime
import json
import threading
from typing import Optional

from app.config import settings
from app.utils.logging import logger

_mqtt_client = None
_mqtt_lock = threading.Lock()
_mqtt_connected = False


class LEDState:
    """Named LED states used across the system."""
    PRESENT = "present"    # green flash (attendance recorded on time)
    LATE = "late"          # yellow flash (attendance recorded late)
    UNKNOWN = "unknown"    # red flash (unrecognized face / spoof / rejection)
    IDLE = "idle"          # off / ready


def _get_mqtt_client():
    """Manage a persistent MQTT client connection."""
    global _mqtt_client, _mqtt_connected
    if not settings.LED_ENABLED:
        return None

    with _mqtt_lock:
        if _mqtt_client is not None and _mqtt_connected:
            return _mqtt_client
        try:
            import paho.mqtt.client as mqtt

            # Support paho-mqtt 2.x and 1.x
            try:
                client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="smart_classroom_backend")
            except Exception:
                client = mqtt.Client(client_id="smart_classroom_backend")

            def on_connect(c, userdata, flags, rc, properties=None):
                global _mqtt_connected
                if rc == 0:
                    _mqtt_connected = True
                    logger.info(f"Connected to MQTT broker at {settings.MQTT_BROKER}:{settings.MQTT_PORT}")
                else:
                    _mqtt_connected = False
                    logger.warning(f"MQTT connection failed with code {rc}")

            def on_disconnect(c, userdata, rc, properties=None):
                global _mqtt_connected
                _mqtt_connected = False
                logger.debug("MQTT disconnected")

            client.on_connect = on_connect
            client.on_disconnect = on_disconnect
            client.connect_async(settings.MQTT_BROKER, settings.MQTT_PORT, keepalive=60)
            client.loop_start()
            _mqtt_client = client
            return _mqtt_client
        except ImportError:
            logger.debug("paho-mqtt not installed — skipping physical MQTT client")
            return None
        except Exception as e:
            logger.warning(f"MQTT init failed: {e}")
            return None


def _publish_mqtt_event(topic: str, payload: str) -> bool:
    """Publish an event to MQTT. Returns True on success."""
    client = _get_mqtt_client()
    if client is not None:
        try:
            client.publish(topic, payload, qos=1)
            return True
        except Exception as e:
            logger.warning(f"MQTT publish error: {e}")
    return False


def trigger_led(
    state: str,
    student_name: str = "",
    classroom_id: int = 0,
    db=None,
) -> dict:
    """Trigger an LED event across hardware (MQTT) and display (WebSocket)."""
    payload_dict = {
        "state": state,
        "student": student_name,
        "classroom_id": classroom_id,
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }
    payload_str = json.dumps(payload_dict)

    mqtt_sent = False
    simulated = True

    if settings.LED_ENABLED:
        topic = f"classroom/{classroom_id}/led" if classroom_id else settings.MQTT_TOPIC
        mqtt_sent = _publish_mqtt_event(topic, payload_str)
        simulated = not mqtt_sent

    if simulated:
        logger.info(
            f"[LED SIMULATION] state={state} student='{student_name}' "
            f"classroom={classroom_id} (simulated mode)"
        )
    else:
        logger.info(
            f"[LED HARDWARE] state={state} student='{student_name}' "
            f"classroom={classroom_id} (MQTT published)"
        )

    # Log to system_events table if DB session provided
    if db is not None:
        try:
            from app.repositories.repository_logging import SystemEventRepository
            SystemEventRepository(db).create(
                source="led_service",
                level="info",
                message=f"LED {state.upper()} — {student_name}",
                details=payload_str,
            )
        except Exception as e:
            logger.warning(f"LED system event write failed: {e}")

    # Broadcast simulated LED state over WebSocket to classroom display
    try:
        import asyncio
        from app.services.websocket_manager import manager

        async def _broadcast():
            await manager.broadcast(classroom_id, {
                "type": "led_event",
                "state": state,
                "student_name": student_name,
                "simulated": simulated,
                "timestamp": payload_dict["timestamp"],
            })

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_broadcast())
        except RuntimeError:
            asyncio.run(_broadcast())
    except Exception as e:
        logger.debug(f"LED WebSocket broadcast failed: {e}")

    return {"state": state, "simulated": simulated, "mqtt_sent": mqtt_sent}


def trigger_attendance_led(
    status: str,
    student_name: str = "",
    classroom_id: int = 0,
    db=None,
) -> dict:
    """Map attendance status to LED state and trigger notification."""
    mapping = {
        "present": LEDState.PRESENT,
        "late": LEDState.LATE,
        "unknown": LEDState.UNKNOWN,
        "low_confidence": LEDState.UNKNOWN,
    }
    led_state = mapping.get(status, LEDState.IDLE)
    return trigger_led(led_state, student_name, classroom_id, db)
