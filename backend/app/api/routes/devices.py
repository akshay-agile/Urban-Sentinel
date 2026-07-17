from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud
from app.api.deps import get_db
from app.schemas.device import DeviceCreate, DeviceRead, DeviceUpdate

router = APIRouter(prefix="/devices", tags=["devices"])


@router.get("/", response_model=list[DeviceRead])
def list_devices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.device.get_multi(db, skip=skip, limit=limit)


@router.get("/by-device-id/{device_id}", response_model=DeviceRead)
def get_device_by_device_id(device_id: str, db: Session = Depends(get_db)):
    obj = crud.device.get_by_device_id(db, device_id=device_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return obj


@router.get("/{device_pk}", response_model=DeviceRead)
def get_device(device_pk: int, db: Session = Depends(get_db)):
    obj = crud.device.get(db, device_pk)
    if obj is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return obj


@router.post("/", response_model=DeviceRead, status_code=201)
def create_device(payload: DeviceCreate, db: Session = Depends(get_db)):
    if crud.device.get_by_device_id(db, device_id=payload.device_id) is not None:
        raise HTTPException(status_code=409, detail="device_id already registered")
    return crud.device.create(db, obj_in=payload.model_dump())


@router.patch("/{device_pk}", response_model=DeviceRead)
def update_device(device_pk: int, payload: DeviceUpdate, db: Session = Depends(get_db)):
    obj = crud.device.get(db, device_pk)
    if obj is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return crud.device.update(db, db_obj=obj, obj_in=payload.model_dump(exclude_unset=True))


@router.delete("/{device_pk}", status_code=204)
def delete_device(device_pk: int, db: Session = Depends(get_db)):
    obj = crud.device.delete(db, id=device_pk)
    if obj is None:
        raise HTTPException(status_code=404, detail="Device not found")
