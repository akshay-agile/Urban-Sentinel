from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import NotificationChannelEnum, NotificationStatusEnum


class NotificationBase(BaseModel):
    user_id: int
    incident_id: int
    channel: NotificationChannelEnum


class NotificationCreate(NotificationBase):
    """
    Manual creation — for testing before the Notification Engine (Session
    9/10) generates these automatically from the Radius Engine's results.
    """


class NotificationUpdate(BaseModel):
    status: NotificationStatusEnum | None = None
    sent_at: datetime | None = None


class NotificationRead(NotificationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: NotificationStatusEnum
    sent_at: datetime | None = None
    created_at: datetime
