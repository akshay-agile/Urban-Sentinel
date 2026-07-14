from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.enums import IncidentStatusEnum, IncidentTypeEnum, SeverityEnum


class Incident(Base):
    """
    Created by the Incident Engine (Session 5) from rule-based thresholds
    on SensorReadings. `radius_meters` feeds the Radius Engine (Session 9)
    to determine which Users get notified.
    """

    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("devices.id"), nullable=True)

    incident_type: Mapped[IncidentTypeEnum] = mapped_column(Enum(IncidentTypeEnum))
    severity: Mapped[SeverityEnum] = mapped_column(Enum(SeverityEnum))
    status: Mapped[IncidentStatusEnum] = mapped_column(Enum(IncidentStatusEnum), default=IncidentStatusEnum.active)

    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    radius_meters: Mapped[float] = mapped_column(Float)

    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    device: Mapped["Device"] = relationship(back_populates="incidents")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="incident")
