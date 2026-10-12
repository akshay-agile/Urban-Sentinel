from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_current_authority, get_db
from app.models.incident import Incident
from app.models.responder import Responder
from app.schemas.responder import ResponderCreate, ResponderRead, ResponderUpdate

router = APIRouter(prefix="/responders", tags=["responders"])
AVAILABILITY = {"available", "unavailable", "on_scene"}


@router.get("/", response_model=list[ResponderRead])
def list_responders(db: Session = Depends(get_db), _authority=Depends(get_current_authority)):
    return db.query(Responder).order_by(Responder.id).all()


@router.post("/", response_model=ResponderRead, status_code=201)
def create_responder(payload: ResponderCreate, db: Session = Depends(get_db), _authority=Depends(get_current_authority)):
    responder = Responder(**payload.model_dump())
    db.add(responder)
    db.commit()
    db.refresh(responder)
    return responder


@router.patch("/{responder_id}", response_model=ResponderRead)
def update_responder(responder_id: int, payload: ResponderUpdate, db: Session = Depends(get_db), _authority=Depends(get_current_authority)):
    responder = db.get(Responder, responder_id)
    if responder is None:
        raise HTTPException(status_code=404, detail="Responder not found")
    values = payload.model_dump(exclude_unset=True)
    availability = values.get("availability")
    if availability is not None and availability not in AVAILABILITY:
        raise HTTPException(status_code=422, detail="availability must be available, unavailable, or on_scene")
    incident_id = values.get("assigned_incident_id")
    if incident_id is not None and db.get(Incident, incident_id) is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    for key, value in values.items():
        setattr(responder, key, value)
    db.commit()
    db.refresh(responder)
    return responder
