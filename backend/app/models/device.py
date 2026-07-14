from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Device(Base):
    """
    A physical (or simulated) sensor node. `device_id` is the human-readable
    identifier from the frozen MQTT JSON schema (docs/sensor_json_schema.md),
    e.g. "fire_node_1" — matched against incoming sensor readings in
    Session 3/4. Nodes have a fixed install location.
    """

    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    label: Mapped[str | None] = mapped_column(String(120), nullable=True)

    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sensor_readings: Mapped[list["SensorReading"]] = relationship(back_populates="device")
    incidents: Mapped[list["Incident"]] = relationship(back_populates="device")
