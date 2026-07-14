from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class SensorReading(Base):
    """
    One row per MQTT message ingested. Field names/types intentionally
    mirror docs/sensor_json_schema.md 1:1 — the MQTT Subscriber (Session 3)
    should be able to map the payload straight onto this model with no
    translation layer.
    """

    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)

    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    humidity: Mapped[float | None] = mapped_column(Float, nullable=True)
    gas: Mapped[int | None] = mapped_column(Integer, nullable=True)
    flame: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rain: Mapped[int | None] = mapped_column(Integer, nullable=True)
    water_level: Mapped[float | None] = mapped_column(Float, nullable=True)
    vibration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sound: Mapped[float | None] = mapped_column(Float, nullable=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    device: Mapped["Device"] = relationship(back_populates="sensor_readings")
