from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.enums import IncidentStatusEnum
from app.models.incident import Incident


class CRUDIncident(CRUDBase[Incident]):
    def get_active(self, db: Session) -> list[Incident]:
        stmt = select(Incident).where(Incident.status == IncidentStatusEnum.active)
        return list(db.scalars(stmt).all())


incident = CRUDIncident(Incident)
