from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.device import Device


class CRUDDevice(CRUDBase[Device]):
    def get_by_device_id(self, db: Session, *, device_id: str) -> Device | None:
        """
        Look up by the string device_id from the MQTT JSON schema
        (e.g. "fire_node_1") — this is what the MQTT Subscriber (Session 3)
        will call for every incoming message.
        """
        stmt = select(Device).where(Device.device_id == device_id)
        return db.scalars(stmt).first()


device = CRUDDevice(Device)
