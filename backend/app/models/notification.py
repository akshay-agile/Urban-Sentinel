from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.enums import NotificationChannelEnum, NotificationStatusEnum


class Notification(Base):
    """
    One row per (user, incident) pair. `channel` records how it was meant
    to be delivered — fcm (Android, background-capable) or local (iOS,
    foreground-only) — per the Session 10 notification architecture
    decision. Created by the Notification Engine once the Radius Engine
    resolves which users are in range.
    """

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id"), index=True)

    channel: Mapped[NotificationChannelEnum] = mapped_column(Enum(NotificationChannelEnum))
    status: Mapped[NotificationStatusEnum] = mapped_column(
        Enum(NotificationStatusEnum), default=NotificationStatusEnum.pending
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="notifications")
    incident: Mapped["Incident"] = relationship(back_populates="notifications")
