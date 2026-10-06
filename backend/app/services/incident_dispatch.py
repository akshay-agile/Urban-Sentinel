from collections.abc import Callable
from typing import Any

from sqlalchemy.orm import Session

from app import crud
from app.models.device import Device
from app.models.enums import SeverityEnum
from app.models.incident import Incident
from app.services.incident_engine import Classification, classify_reading
from app.services.notification_content import build_notification_content
from app.services.notification_engine import generate_notifications_for_incident
from app.services.push_delivery import deliver_notifications

_SEVERITY_ORDER = [
    SeverityEnum.low,
    SeverityEnum.medium,
    SeverityEnum.high,
    SeverityEnum.critical,
]

BroadcastFn = Callable[[dict[str, Any]], None]


def dispatch_classification(
    db: Session,
    device: Device,
    classification: Classification,
    broadcast: BroadcastFn,
) -> Incident:
    """Create or update an incident and run the existing notification pipeline."""

    existing = crud.incident.get_active_for_device_and_type(
        db,
        device_id=device.id,
        incident_type=classification.incident_type,
    )

    if existing is not None:
        if (
            _SEVERITY_ORDER.index(classification.severity)
            > _SEVERITY_ORDER.index(existing.severity)
        ):
            existing = crud.incident.update(
                db,
                db_obj=existing,
                obj_in={"severity": classification.severity},
            )

            broadcast({
                "type": "incident_updated",
                "id": existing.id,
                "status": existing.status.value,
                "severity": existing.severity.value,
            })

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

    broadcast({
        "type": "incident_created",
        "id": incident.id,
        "incident_type": incident.incident_type.value,
        "severity": incident.severity.value,
    })

    notifications = generate_notifications_for_incident(db, incident)
    deliver_notifications(db, notifications, incident)

    for item in notifications:
        n = item.notification

        title, body = build_notification_content(
            incident,
            distance_meters=item.distance_meters,
            user_latitude=item.user_latitude,
            user_longitude=item.user_longitude,
        )

        broadcast({
            "type": "notification_created",
            "id": n.id,
            "user_id": n.user_id,
            "incident_id": incident.id,
            "channel": n.channel.value,
            "status": n.status.value,
            "title": title,
            "body": body,
        })

    return incident


def evaluate_and_dispatch(
    db: Session,
    device: Device,
    reading: dict,
    broadcast: BroadcastFn,
) -> Incident | None:
    """Classify a sensor reading and dispatch it through the shared pipeline."""

    classification = classify_reading(reading)

    if classification is None:
        return None

    return dispatch_classification(
        db=db,
        device=device,
        classification=classification,
        broadcast=broadcast,
    )