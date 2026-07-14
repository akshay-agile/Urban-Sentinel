from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.sensor_reading import SensorReading


class CRUDSensorReading(CRUDBase[SensorReading]):
    def get_recent_for_device(self, db: Session, *, device_id: int, limit: int = 20) -> list[SensorReading]:
        stmt = (
            select(SensorReading)
            .where(SensorReading.device_id == device_id)
            .order_by(SensorReading.timestamp.desc())
            .limit(limit)
        )
        return list(db.scalars(stmt).all())


sensor_reading = CRUDSensorReading(SensorReading)
