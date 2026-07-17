from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import IncidentStatusEnum, IncidentTypeEnum, SeverityEnum


class IncidentBase(BaseModel):
    incident_type: IncidentTypeEnum
    severity: SeverityEnum
    latitude: float
    longitude: float
    radius_meters: float
    device_id: int | None = None


class IncidentCreate(IncidentBase):
    """
    Manual creation — useful for testing the Notification Engine (Session
    9/10) and dashboard/mobile screens (Session 6/7) before the rule-based
    Incident Engine (Session 11) exists to create these automatically.
    """


class IncidentUpdate(BaseModel):
    status: IncidentStatusEnum | None = None
    severity: SeverityEnum | None = None
    resolved_at: datetime | None = None


class IncidentRead(IncidentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: IncidentStatusEnum
    detected_at: datetime
    resolved_at: datetime | None = None
