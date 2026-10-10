"""
Notification Engine.

Runs the Radius Engine for an incident, then creates a Notification row
for every matched user — channel chosen per the Session 6/10 architecture
decision (Android -> fcm, background-capable; iOS -> local, foreground-only).

Safe to call more than once for the same incident: users who already have
a notification for it are skipped, so re-running (e.g. via the manual
/notify endpoint) never creates duplicates.

Returns each notification alongside the matched user's distance/location,
so callers can build a personalized message (see notification_content.py)
rather than a generic one — knowing "800m radius" means nothing to a
person; knowing "you're 350m northeast of it" does.
"""
from dataclasses import dataclass

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import crud
from app.models.enums import NotificationChannelEnum, NotificationStatusEnum, PlatformEnum
from app.models.incident import Incident
from app.models.notification import Notification
from app.services.radius_engine import find_users_in_radius


@dataclass
class DispatchedNotification:
    notification: Notification
    distance_meters: float
    user_latitude: float
    user_longitude: float


def _channel_for_platform(platform: PlatformEnum | None) -> NotificationChannelEnum:
    if platform == PlatformEnum.ios:
        return NotificationChannelEnum.local
    # Android, or platform not yet reported — default to fcm.
    return NotificationChannelEnum.fcm


def generate_notifications_for_incident(db: Session, incident: Incident) -> list[DispatchedNotification]:
    nearby = find_users_in_radius(db, incident)
    created: list[DispatchedNotification] = []

    for match in nearby:
        channel = _channel_for_platform(match.user.platform)
        notification = crud.notification.get_by_user_and_incident(
            db, user_id=match.user.id, incident_id=incident.id
        )

        if notification is not None:
            # Failed/pending FCM rows are eligible for an explicit retry via
            # /incidents/{id}/notify. Sent rows never enter delivery again.
            if (
                notification.channel != NotificationChannelEnum.fcm
                or notification.status not in {
                    NotificationStatusEnum.pending,
                    NotificationStatusEnum.failed,
                }
            ):
                continue
        else:
            notification = Notification(
                user_id=match.user.id,
                incident_id=incident.id,
                channel=channel,
            )
            try:
                # The unique constraint is the cross-process idempotency
                # guard. The savepoint lets a concurrent winner commit while
                # this request safely reads the already-created row.
                with db.begin_nested():
                    db.add(notification)
                    db.flush()
            except IntegrityError:
                notification = crud.notification.get_by_user_and_incident(
                    db, user_id=match.user.id, incident_id=incident.id
                )
                if notification is None:
                    raise
                if (
                    notification.channel != NotificationChannelEnum.fcm
                    or notification.status not in {
                        NotificationStatusEnum.pending,
                        NotificationStatusEnum.failed,
                    }
                ):
                    continue
            else:
                db.commit()
                db.refresh(notification)

        created.append(
            DispatchedNotification(
                notification=notification,
                distance_meters=match.distance_meters,
                user_latitude=match.user.latitude,
                user_longitude=match.user.longitude,
            )
        )

    return created
