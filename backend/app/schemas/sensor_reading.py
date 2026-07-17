from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SensorReadingRead(BaseModel):
    """
    Read-only. There is deliberately no SensorReadingCreate/POST endpoint —
    readings only enter the system through the MQTT ingestion pipeline
    (Session 3), so the API can't be used to inject fake sensor data and
    the MQTT path stays the single source of truth.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: int
    timestamp: datetime
    temperature: float | None = None
    humidity: float | None = None
    gas: int | None = None
    flame: int | None = None
    rain: int | None = None
    water_level: float | None = None
    vibration: int | None = None
    sound: float | None = None
    latitude: float
    longitude: float
    created_at: datetime
