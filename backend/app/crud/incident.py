from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.enums import IncidentStatusEnum, IncidentTypeEnum
from app.models.incident import Incident


class CRUDIncident(CRUDBase[Incident]):
    def get_active(self, db: Session) -> list[Incident]:
        stmt = select(Incident).where(Incident.status == IncidentStatusEnum.active)
        return list(db.scalars(stmt).all())

    def get_active_for_device_and_type(
        self, db: Session, *, device_id: int, incident_type: IncidentTypeEnum
    ) -> Incident | None:
        """
        Used by the Incident Engine (Session 11) to avoid creating a new
        incident (and re-notifying everyone) every few seconds while a
        condition persists across multiple sensor readings — e.g. a fire
        that's still burning shouldn't spawn a fresh incident on every
        5-second reading.
        """
        stmt = select(Incident).where(
            Incident.device_id == device_id,
            Incident.incident_type == incident_type,
            Incident.status == IncidentStatusEnum.active,
        )
        return db.scalars(stmt).first()


incident = CRUDIncident(Incident)
