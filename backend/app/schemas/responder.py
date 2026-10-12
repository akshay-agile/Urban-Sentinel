from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ResponderCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    role: str = Field(min_length=1, max_length=80)
    phone_number: str | None = Field(default=None, max_length=20)


class ResponderUpdate(BaseModel):
    availability: str | None = None
    assigned_incident_id: int | None = None


class ResponderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    role: str
    phone_number: str | None
    availability: str
    assigned_incident_id: int | None
    created_at: datetime
