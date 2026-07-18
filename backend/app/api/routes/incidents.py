from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud
from app.api.deps import get_db
from app.schemas.incident import IncidentCreate, IncidentRead, IncidentUpdate
from app.ws.manager import manager as ws_manager

router = APIRouter(prefix="/incidents", tags=["incidents"])


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


@router.post("/", response_model=IncidentRead, status_code=201)
async def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    if payload.device_id is not None and crud.device.get(db, payload.device_id) is None:
        raise HTTPException(status_code=404, detail="device_id does not reference an existing device")
    obj = crud.incident.create(db, obj_in=payload.model_dump())
    await ws_manager.broadcast(
        {"type": "incident_created", "id": obj.id, "incident_type": obj.incident_type.value, "severity": obj.severity.value}
    )
    return obj


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
