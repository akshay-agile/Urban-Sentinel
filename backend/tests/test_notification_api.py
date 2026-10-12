import unittest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api import deps
from app.api.routes.notifications import router
from app.db.base import Base
from app.models.enums import (
    IncidentStatusEnum, IncidentTypeEnum, NotificationChannelEnum, RoleEnum, SeverityEnum,
)
from app.models.incident import Incident
from app.models.notification import Notification
from app.models.user import User


class NotificationApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.current = User(full_name="Recipient", email="recipient@example.test", hashed_password="test", role=RoleEnum.citizen)
        other = User(full_name="Other", email="other@example.test", hashed_password="test", role=RoleEnum.citizen)
        self.db.add_all([self.current, other])
        incident = Incident(
            incident_type=IncidentTypeEnum.fire, severity=SeverityEnum.medium,
            status=IncidentStatusEnum.active, latitude=12.9, longitude=77.5, radius_meters=500,
        )
        self.db.add(incident)
        self.db.flush()
        self.db.add_all([
            Notification(user=self.current, incident=incident, channel=NotificationChannelEnum.fcm),
            Notification(user=other, incident=incident, channel=NotificationChannelEnum.fcm),
        ])
        self.db.commit()
        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[deps.get_db] = lambda: self.db
        app.dependency_overrides[deps.get_current_user] = lambda: self.current
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def test_mine_only_returns_authenticated_users_records(self):
        response = self.client.get("/notifications/mine")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["user_id"], self.current.id)

    def test_user_route_rejects_other_recipient(self):
        other = self.db.query(User).filter(User.id != self.current.id).one()
        response = self.client.get(f"/notifications/user/{other.id}")
        self.assertEqual(response.status_code, 403)


if __name__ == "__main__":
    unittest.main()
