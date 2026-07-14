"""
Enums shared across models. Kept in one place so the Incident Engine
(Session 5) and Notification Engine (Session 9/10) reference the exact
same values as the database layer.
"""
import enum


class RoleEnum(str, enum.Enum):
    citizen = "citizen"
    authority = "authority"


class PlatformEnum(str, enum.Enum):
    android = "android"
    ios = "ios"


class IncidentTypeEnum(str, enum.Enum):
    fire = "fire"
    gas_leak = "gas_leak"
    flood = "flood"
    structural_damage = "structural_damage"
    temperature_spike = "temperature_spike"
    explosion = "explosion"


class SeverityEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class IncidentStatusEnum(str, enum.Enum):
    active = "active"
    resolved = "resolved"


class NotificationChannelEnum(str, enum.Enum):
    fcm = "fcm"        # Android — full remote push
    local = "local"     # iOS — foreground-only local notification


class NotificationStatusEnum(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"
    read = "read"
