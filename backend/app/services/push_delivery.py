"""
Push delivery.

Android (channel=fcm): sends a real push via Firebase Admin SDK, using
the user's native FCM device token (registered by the mobile app in
Session 10). Works even if the app is backgrounded or closed.

iOS (channel=local): there is nothing to send server-side — delivery
happens client-side, via the app receiving the notification_created
WebSocket event (Session 8) while foregrounded and firing a local
notification itself. This module just marks those as sent immediately,
best-effort, since we can't confirm client-side delivery from the server.

Gracefully degrades if Firebase isn't configured: FCM sends are skipped
(logged, not crashed) so the rest of the app keeps working without it —
useful since Firebase setup is a manual, external step (see
mobile/README.md and backend/README.md).
"""
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app import crud
from app.core.config import get_settings
from app.models.enums import NotificationChannelEnum, NotificationStatusEnum
from app.models.incident import Incident
from app.models.notification import Notification
from app.services.notification_content import build_notification_content

logger = logging.getLogger("urban_sentinel.push")

_firebase_ready = False


def init_firebase() -> bool:
    """Called once at startup (see app/main.py lifespan). Returns whether
    FCM sending is actually available this run."""
    global _firebase_ready
    settings = get_settings()

    if not settings.firebase_credentials_path:
        logger.warning(
            "FIREBASE_CREDENTIALS_PATH not set — FCM push (Android) disabled. "
            "iOS local notifications are unaffected. See mobile/README.md Session 10 setup."
        )
        _firebase_ready = False
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            cred = credentials.Certificate(settings.firebase_credentials_path)
            firebase_admin.initialize_app(cred)
        _firebase_ready = True
        logger.info("Firebase Admin SDK initialized — FCM push enabled")
        return True
    except Exception:
        logger.exception("Failed to initialize Firebase Admin SDK — FCM push disabled")
        _firebase_ready = False
        return False


def is_firebase_ready() -> bool:
    return _firebase_ready


def _send_fcm(push_token: str, title: str, body: str, data: dict) -> bool:
    try:
        from firebase_admin import messaging

        message = messaging.Message(
            token=push_token,
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in data.items()},
        )
        messaging.send(message)
        return True
    except Exception:
        logger.exception("FCM send failed for a device token")
        return False


def deliver_notifications(db: Session, notifications: list[Notification], incident: Incident) -> None:
    """
    Attempts real delivery for every notification just created by the
    Notification Engine (Session 9). Updates each row's status/sent_at
    accordingly. Safe to call even if Firebase isn't configured — fcm
    notifications are simply left pending in that case, with a warning.
    """
    if not notifications:
        return

    title, body = build_notification_content(incident)

    for notification in notifications:
        if notification.channel == NotificationChannelEnum.fcm:
            if not _firebase_ready:
                logger.warning(
                    "Skipping FCM delivery for notification #%d — Firebase not configured", notification.id
                )
                continue

            user = crud.user.get(db, notification.user_id)
            if user is None or not user.push_token:
                crud.notification.update(db, db_obj=notification, obj_in={"status": NotificationStatusEnum.failed})
                continue

            success = _send_fcm(user.push_token, title, body, {"incident_id": incident.id})
            crud.notification.update(
                db,
                db_obj=notification,
                obj_in={
                    "status": NotificationStatusEnum.sent if success else NotificationStatusEnum.failed,
                    "sent_at": datetime.now(timezone.utc) if success else None,
                },
            )
        else:
            # local channel — the WebSocket broadcast (already sent by
            # the caller) is the actual delivery mechanism; this is a
            # best-effort status update, not a delivery receipt.
            crud.notification.update(
                db,
                db_obj=notification,
                obj_in={"status": NotificationStatusEnum.sent, "sent_at": datetime.now(timezone.utc)},
            )
