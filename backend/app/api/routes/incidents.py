from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud
from app.api.deps import get_db
from app.schemas.incident import IncidentCreate, IncidentRead, IncidentUpdate
from app.schemas.notification import NotificationRead
from app.schemas.radius import NearbyUserRead
from app.services.notification_engine import generate_notifications_for_incident
from app.services.radius_engine import find_users_in_radius
from app.ws.manager import manager as ws_manager

router = APIRouter(prefix="/incidents", tags=["incidents"])


async def _broadcast_notifications(notifications, incident_id: int) -> None:
    for n in notifications:
        await ws_manager.broadcast(
            {
                "type": "notification_created",
                "id": n.id,
                "user_id": n.user_id,
                "incident_id": incident_id,
                "channel": n.channel.value,
            }
        )


@router.get("/", response_model=list[IncidentRead])
def list_incidents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.incident.get_multi(db, skip=skip, limit=limit)


@router.get("/active", response_model=list[IncidentRead])
def list_active_incidents(db: Session = Depends(get_db)):
    return crud.incident.get_active(db)


@router.get("/{incident_id}", response_model=IncidentRead)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    obj = crud.incident.get(db, incident_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return obj


@router.get("/{incident_id}/nearby-users", response_model=list[NearbyUserRead])
def get_nearby_users(incident_id: int, db: Session = Depends(get_db)):
    """
    Debug/verification endpoint — shows exactly which registered users the
    Radius Engine considers "nearby" for this incident, and how far away
    each one is. Doesn't create anything; read-only.
    """
    obj = crud.incident.get(db, incident_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    matches = find_users_in_radius(db, obj)
    return [
        NearbyUserRead(
            user_id=m.user.id,
            full_name=m.user.full_name,
            email=m.user.email,
            distance_meters=round(m.distance_meters, 1),
        )
        for m in matches
    ]


@router.post("/", response_model=IncidentRead, status_code=201)
async def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    if payload.device_id is not None and crud.device.get(db, payload.device_id) is None:
        raise HTTPException(status_code=404, detail="device_id does not reference an existing device")

    obj = crud.incident.create(db, obj_in=payload.model_dump())

    await ws_manager.broadcast(
        {"type": "incident_created", "id": obj.id, "incident_type": obj.incident_type.value, "severity": obj.severity.value}
    )

    # Radius Engine + Notification Engine run automatically on every new
    # incident, regardless of whether it was created manually (this
    # endpoint) or, from Session 11 onward, by the automated rule engine.
    notifications = generate_notifications_for_incident(db, obj)
    await _broadcast_notifications(notifications, obj.id)

    return obj


@router.post("/{incident_id}/notify", response_model=list[NotificationRead])
async def recompute_notifications(incident_id: int, db: Session = Depends(get_db)):
    """
    Manually (re-)runs the Radius/Notification Engine for an existing
    incident — e.g. if new users registered after the incident was
    created. Safe to call repeatedly: already-notified users are skipped.
    """
    obj = crud.incident.get(db, incident_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    notifications = generate_notifications_for_incident(db, obj)
    await _broadcast_notifications(notifications, obj.id)
    return notifications


@router.patch("/{incident_id}", response_model=IncidentRead)
async def update_incident(incident_id: int, payload: IncidentUpdate, db: Session = Depends(get_db)):
    obj = crud.incident.get(db, incident_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    obj = crud.incident.update(db, db_obj=obj, obj_in=payload.model_dump(exclude_unset=True))
    await ws_manager.broadcast({"type": "incident_updated", "id": obj.id, "status": obj.status.value})
    return obj


@router.delete("/{incident_id}", status_code=204)
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    obj = crud.incident.delete(db, id=incident_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Incident not found")
