"""
Notification Engine.

Runs the Radius Engine for an incident, then creates a Notification row
for every matched user — channel chosen per the Session 6/10 architecture
decision (Android -> fcm, background-capable; iOS -> local, foreground-only).

Safe to call more than once for the same incident: users who already have
a notification for it are skipped, so re-running (e.g. via the manual
/notify endpoint) never creates duplicates.
"""
from sqlalchemy.orm import Session

from app import crud
from app.models.enums import NotificationChannelEnum, PlatformEnum
from app.models.incident import Incident
from app.models.notification import Notification
from app.services.radius_engine import find_users_in_radius


def _channel_for_platform(platform: PlatformEnum | None) -> NotificationChannelEnum:
    if platform == PlatformEnum.ios:
        return NotificationChannelEnum.local
    # Android, or platform not yet reported — default to fcm.
    return NotificationChannelEnum.fcm


def generate_notifications_for_incident(db: Session, incident: Incident) -> list[Notification]:
    nearby = find_users_in_radius(db, incident)
    created: list[Notification] = []

    for match in nearby:
        if crud.notification.get_by_user_and_incident(db, user_id=match.user.id, incident_id=incident.id):
            continue

        channel = _channel_for_platform(match.user.platform)
        notification = crud.notification.create(
            db,
            obj_in={"user_id": match.user.id, "incident_id": incident.id, "channel": channel},
        )
        created.append(notification)

    return created
