from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base


class Responder(Base):
    __tablename__ = "responders"
    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(80))
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    availability: Mapped[str] = mapped_column(String(20), default="unavailable")
    assigned_incident_id: Mapped[int | None] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    assigned_incident: Mapped["Incident | None"] = relationship()
