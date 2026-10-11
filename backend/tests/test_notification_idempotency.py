import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.device import Device
from app.models.enums import (
    IncidentStatusEnum,
    IncidentTypeEnum,
    NotificationChannelEnum,
    NotificationStatusEnum,
    PlatformEnum,
    RoleEnum,
    SeverityEnum,
)
from app.models.incident import Incident
from app.models.notification import Notification
from app.models.user import User
from app.services.incident_dispatch import dispatch_classification
from app.services.incident_engine import Classification
from app.services import notification_engine, push_delivery


class NotificationIdempotencyTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.device = Device(
            device_id="notification-test-camera",
            label="Notification test camera",
            latitude=12.9716,
            longitude=77.5946,
            is_active=True,
        )
        self.db.add(self.device)
        for index in range(2):
            self.db.add(
                User(
                    full_name=f"Test Recipient {index + 1}",
                    email=f"notification-test-{index + 1}@example.test",
                    hashed_password="not-a-real-password-hash",
                    role=RoleEnum.citizen,
                    latitude=12.9716,
                    longitude=77.5946,
                    push_token=f"test-token-{index + 1}",
                    platform=PlatformEnum.android,
                    is_active=True,
                )
            )
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def make_incident(self):
        incident = Incident(
            device_id=self.device.id,
            incident_type=IncidentTypeEnum.fire,
            severity=SeverityEnum.medium,
            status=IncidentStatusEnum.active,
            latitude=self.device.latitude,
            longitude=self.device.longitude,
            radius_meters=1000,
        )
        self.db.add(incident)
        self.db.commit()
        return incident

    def notification_count(self):
        return self.db.scalar(select(func.count()).select_from(Notification))

    def test_reprocessing_is_idempotent_and_distinct_incidents_reach_all_recipients(self):
        incident = self.make_incident()

        with (
            patch.object(push_delivery, "_firebase_ready", True),
            patch.object(push_delivery, "_send_fcm", return_value=True) as send,
        ):
            first_batch = notification_engine.generate_notifications_for_incident(self.db, incident)
            push_delivery.deliver_notifications(self.db, first_batch, incident)

            repeated_batch = notification_engine.generate_notifications_for_incident(self.db, incident)
            push_delivery.deliver_notifications(self.db, repeated_batch, incident)

            self.assertEqual(len(first_batch), 2)
            self.assertEqual(repeated_batch, [])
            self.assertEqual(send.call_count, 2)
            self.assertEqual(self.notification_count(), 2)
            self.assertEqual(
                {call.args[0] for call in send.call_args_list},
                {"test-token-1", "test-token-2"},
            )

            distinct_incident = self.make_incident()
            distinct_batch = notification_engine.generate_notifications_for_incident(
                self.db, distinct_incident
            )
            push_delivery.deliver_notifications(self.db, distinct_batch, distinct_incident)

            self.assertEqual(len(distinct_batch), 2)
            self.assertEqual(send.call_count, 4)
            self.assertEqual(self.notification_count(), 4)

    def test_failed_fcm_delivery_can_retry_without_creating_another_row(self):
        incident = self.make_incident()
        user = self.db.scalars(select(User).order_by(User.id)).first()
        # Keep this retry test to one eligible recipient.
        other_user = self.db.scalars(select(User).where(User.id != user.id)).first()
        other_user.is_active = False
        self.db.commit()

        with (
            patch.object(push_delivery, "_firebase_ready", True),
            patch.object(
                push_delivery, "_send_fcm", side_effect=[False, True]
            ) as send,
        ):
            failed_batch = notification_engine.generate_notifications_for_incident(self.db, incident)
            push_delivery.deliver_notifications(self.db, failed_batch, incident)
            notification_id = failed_batch[0].notification.id
            self.assertEqual(failed_batch[0].notification.status, NotificationStatusEnum.failed)

            retry_batch = notification_engine.generate_notifications_for_incident(self.db, incident)
            push_delivery.deliver_notifications(self.db, retry_batch, incident)

            self.assertEqual(len(retry_batch), 1)
            self.assertEqual(retry_batch[0].notification.id, notification_id)
            self.assertEqual(retry_batch[0].notification.status, NotificationStatusEnum.sent)
            self.assertEqual(send.call_count, 2)
            self.assertEqual(self.notification_count(), 1)

    def test_camera_update_retries_failed_fcm_notification_for_existing_incident(self):
        user = self.db.scalars(select(User).order_by(User.id)).first()
        other_user = self.db.scalars(select(User).where(User.id != user.id)).first()
        other_user.is_active = False
        self.db.commit()

        classification = Classification(
            incident_type=IncidentTypeEnum.fire,
            severity=SeverityEnum.medium,
            radius_meters=1000,
        )
        broadcast_events = []

        with (
            patch.object(push_delivery, "_firebase_ready", True),
            patch.object(push_delivery, "_send_fcm", side_effect=[False, True]) as send,
        ):
            created = dispatch_classification(
                self.db,
                self.device,
                classification,
                broadcast_events.append,
            )
            notification = self.db.scalar(select(Notification))
            self.assertEqual(notification.status, NotificationStatusEnum.failed)

            updated = dispatch_classification(
                self.db,
                self.device,
                classification,
                broadcast_events.append,
            )

        self.assertEqual(updated.id, created.id)
        self.assertEqual(send.call_count, 2)
        self.assertEqual(self.notification_count(), 1)
        self.assertEqual(notification.status, NotificationStatusEnum.sent)
        self.assertEqual(
            sum(event["type"] == "notification_created" for event in broadcast_events),
            2,
            "The retry should re-announce delivery through the existing notification event",
        )

    def test_database_constraint_rejects_duplicate_recipient_incident_rows(self):
        incident = self.make_incident()
        user = self.db.scalars(select(User).order_by(User.id)).first()
        self.db.add(
            Notification(
                user_id=user.id,
                incident_id=incident.id,
                channel=NotificationChannelEnum.fcm,
            )
        )
        self.db.commit()
        self.db.add(
            Notification(
                user_id=user.id,
                incident_id=incident.id,
                channel=NotificationChannelEnum.fcm,
            )
        )
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()
        self.assertEqual(self.notification_count(), 1)


if __name__ == "__main__":
    unittest.main()
