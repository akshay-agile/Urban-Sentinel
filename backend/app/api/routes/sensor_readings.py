from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud
from app.api.deps import get_db
from app.schemas.sensor_reading import SensorReadingRead

router = APIRouter(prefix="/sensor-readings", tags=["sensor-readings"])


@router.get("/", response_model=list[SensorReadingRead])
def list_sensor_readings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.sensor_reading.get_multi(db, skip=skip, limit=limit)


@router.get("/device/{device_pk}", response_model=list[SensorReadingRead])
def get_readings_for_device(device_pk: int, limit: int = 20, db: Session = Depends(get_db)):
    if crud.device.get(db, device_pk) is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return crud.sensor_reading.get_recent_for_device(db, device_id=device_pk, limit=limit)


@router.get("/{reading_id}", response_model=SensorReadingRead)
def get_sensor_reading(reading_id: int, db: Session = Depends(get_db)):
    obj = crud.sensor_reading.get(db, reading_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Sensor reading not found")
    return obj
