from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.enums import PlatformEnum, RoleEnum


class User(Base):
    """
    Citizens (mobile app users) and authority users (dashboard) share this
    table, distinguished by `role`. Push/location fields are kept directly
    on User rather than a separate table — one device per user is enough
    for this project's scope.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum), default=RoleEnum.citizen)

    # Last known location — used by the Radius Engine (Session 9) to decide
    # who falls inside an incident's alert radius.
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Push delivery — populated in Session 6 (registration) and used in
    # Session 10. FCM token for Android, Expo/local token reference for iOS.
    push_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    platform: Mapped[PlatformEnum | None] = mapped_column(Enum(PlatformEnum), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")
