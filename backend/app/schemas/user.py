from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import PlatformEnum, RoleEnum


class UserRegister(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone_number: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    phone_number: str | None = None
    role: RoleEnum
    latitude: float | None = None
    longitude: float | None = None
    platform: PlatformEnum | None = None
    is_active: bool
    created_at: datetime


class UserUpdateMe(BaseModel):
    """
    Fields the mobile app updates about itself — profile edits (Profile
    screen), and location/push registration (Home screen, on permission
    grant). Password changes are out of scope for this session.
    """
    full_name: str | None = None
    phone_number: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    push_token: str | None = None
    platform: PlatformEnum | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
