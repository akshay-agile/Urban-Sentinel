"""
MQTT Subscriber.

Listens on urban_sentinel/sensors/# and, for every message:
  1. Parses the JSON payload against the frozen schema
     (docs/sensor_json_schema.md).
  2. Resolves the Device row by device_id, auto-registering it on first
     sight (using the lat/lon in the payload as its install location).
  3. Persists a SensorReading via the Session 2 CRUD layer.

No incident detection, no severity, no alerting here — that's the
Incident Engine, built in Session 5. This module's only job is: message
in, row in the database.
"""
import json
import logging
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

from app import crud
from app.db.session import SessionLocal
from app.mqtt.client import build_client, connect
from app.mqtt.topics import wildcard_topic

logger = logging.getLogger("urban_sentinel.mqtt.subscriber")

REQUIRED_FIELDS = {
    "device_id",
    "timestamp",
    "latitude",
    "longitude",
}


def _parse_payload(raw: bytes) -> dict | None:
    try:
        data = json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        logger.warning("Dropped unparseable message: %s", exc)
        return None

    missing = REQUIRED_FIELDS - data.keys()
    if missing:
        logger.warning("Dropped message missing required fields %s: %s", missing, data)
        return None

    return data


def _persist_reading(data: dict) -> None:
    db = SessionLocal()
    try:
        device = crud.device.get_by_device_id(db, device_id=data["device_id"])
        if device is None:
            device = crud.device.create(
                db,
                obj_in={
                    "device_id": data["device_id"],
                    "latitude": data["latitude"],
                    "longitude": data["longitude"],
                },
            )
            logger.info("Auto-registered new device: %s", data["device_id"])

        crud.device.update(db, db_obj=device, obj_in={"last_seen_at": datetime.now(timezone.utc)})

        crud.sensor_reading.create(
            db,
            obj_in={
                "device_id": device.id,
                "timestamp": datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00")),
                "temperature": data.get("temperature"),
                "humidity": data.get("humidity"),
                "gas": data.get("gas"),
                "flame": data.get("flame"),
                "rain": data.get("rain"),
                "water_level": data.get("water_level"),
                "vibration": data.get("vibration"),
                "sound": data.get("sound"),
                "latitude": data["latitude"],
                "longitude": data["longitude"],
            },
        )
        logger.info("Stored reading from %s", data["device_id"])
    finally:
        db.close()


def on_connect(client: mqtt.Client, userdata, flags, reason_code, properties) -> None:
    if reason_code == 0:
        logger.info("Connected to MQTT broker")
        client.subscribe(wildcard_topic())
        logger.info("Subscribed to %s", wildcard_topic())
    else:
        logger.error("MQTT connection failed: %s", reason_code)


def on_message(client: mqtt.Client, userdata, message: mqtt.MQTTMessage) -> None:
    logger.debug("Message on %s (%d bytes)", message.topic, len(message.payload))
    data = _parse_payload(message.payload)
    if data is not None:
        _persist_reading(data)


def run_forever() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    client = build_client(client_id="urban-sentinel-backend-subscriber")
    client.on_connect = on_connect
    client.on_message = on_message
    connect(client)
    client.loop_forever()


if __name__ == "__main__":
    run_forever()
