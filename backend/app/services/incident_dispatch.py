"""
Ties the Incident Engine's classification to actually creating (or
updating) an incident, then runs the exact same Radius Engine ->
Notification Engine -> Push Delivery -> WebSocket broadcast pipeline that
the manual `POST /api/v1/incidents/` endpoint uses (Sessions 9-10) — no
duplicated logic, just triggered by a live sensor reading instead of a
human hitting an API.

Called from the MQTT subscriber (Session 3/8) after every reading is
persisted.
"""
from collections.abc import Callable
from typing import Any

from sqlalchemy.orm import Session

from app import crud
from app.models.device import Device
from app.models.enums import SeverityEnum
from app.models.incident import Incident
from app.services.incident_engine import classify_reading
from app.services.notification_content import build_notification_content
from app.services.notification_engine import generate_notifications_for_incident
from app.services.push_delivery import deliver_notifications

_SEVERITY_ORDER = [SeverityEnum.low, SeverityEnum.medium, SeverityEnum.high, SeverityEnum.critical]

BroadcastFn = Callable[[dict[str, Any]], None]


def evaluate_and_dispatch(db: Session, device: Device, reading: dict, broadcast: BroadcastFn) -> Incident | None:
    """
    Returns the relevant Incident if the reading triggered or matched
    one, else None. `broadcast` is the same sync-callable bridge the
    subscriber already uses for sensor_reading/device_registered events
    (see app/mqtt/subscriber.py) — this keeps the incident engine itself
    free of any FastAPI/asyncio dependency.
    """
    classification = classify_reading(reading)
    if classification is None:
        return None

    existing = crud.incident.get_active_for_device_and_type(
        db, device_id=device.id, incident_type=classification.incident_type
    )

    if existing is not None:
        # Same condition still ongoing — don't spawn a duplicate incident
        # or re-notify everyone every few seconds. Do escalate severity
        # if it's gotten worse, since that's genuinely new information,
        # but deliberately don't re-notify on escalation alone (a
        # conservative choice to avoid notification spam; worth
        # revisiting if the project wants escalation alerts later).
        if _SEVERITY_ORDER.index(classification.severity) > _SEVERITY_ORDER.index(existing.severity):
            existing = crud.incident.update(db, db_obj=existing, obj_in={"severity": classification.severity})
            broadcast(
                {"type": "incident_updated", "id": existing.id, "status": existing.status.value, "severity": existing.severity.value}
            )
        return existing

    incident = crud.incident.create(
        db,
        obj_in={
            "device_id": device.id,
            "incident_type": classification.incident_type,
            "severity": classification.severity,
            "latitude": device.latitude,
            "longitude": device.longitude,
            "radius_meters": classification.radius_meters,
        },
    )
    broadcast(
        {
            "type": "incident_created",
            "id": incident.id,
            "incident_type": incident.incident_type.value,
            "severity": incident.severity.value,
        }
    )

    notifications = generate_notifications_for_incident(db, incident)
    deliver_notifications(db, notifications, incident)

    if notifications:
        title, body = build_notification_content(incident)
        for n in notifications:
            broadcast(
                {
                    "type": "notification_created",
                    "id": n.id,
                    "user_id": n.user_id,
                    "incident_id": incident.id,
                    "channel": n.channel.value,
                    "status": n.status.value,
                    "title": title,
                    "body": body,
                }
            )

    return incident
