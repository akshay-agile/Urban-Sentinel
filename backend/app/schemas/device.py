from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DeviceBase(BaseModel):
    device_id: str
    label: str | None = None
    latitude: float
    longitude: float
    is_active: bool = True


class DeviceCreate(DeviceBase):
    """For manually pre-registering a node. The MQTT subscriber (Session 3)
    also auto-creates devices on first message — this endpoint is for
    authorities registering nodes ahead of time instead."""


class DeviceUpdate(BaseModel):
    label: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_active: bool | None = None


class DeviceRead(DeviceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    last_seen_at: datetime | None = None
    created_at: datetime
