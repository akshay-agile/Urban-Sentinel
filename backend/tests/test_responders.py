import unittest

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api import deps
from app.api.routes.responders import router
from app.db.base import Base
from app.models.enums import IncidentStatusEnum, IncidentTypeEnum, SeverityEnum
from app.models.incident import Incident
from app.models.user import User
from app.models.enums import RoleEnum


class ResponderApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = User(full_name="Authority", email="authority@example.test", hashed_password="test")
        self.db.add(self.user)
        incident = Incident(
            incident_type=IncidentTypeEnum.fire,
            severity=SeverityEnum.high,
            status=IncidentStatusEnum.active,
            latitude=12.9,
            longitude=77.5,
            radius_meters=500,
        )
        self.db.add(incident)
        self.db.commit()
        self.incident_id = incident.id
        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[deps.get_db] = lambda: self.db
        app.dependency_overrides[deps.get_current_authority] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def test_create_and_update_responder_assignment(self):
        created = self.client.post(
            "/responders/",
            json={"full_name": "Field Responder", "role": "Fire service", "phone_number": None},
        )
        self.assertEqual(created.status_code, 201)
        responder_id = created.json()["id"]
        self.assertEqual(created.json()["availability"], "unavailable")

        updated = self.client.patch(
            f"/responders/{responder_id}",
            json={"availability": "available", "assigned_incident_id": self.incident_id},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["availability"], "available")
        self.assertEqual(updated.json()["assigned_incident_id"], self.incident_id)

    def test_reject_invalid_status_and_unknown_incident(self):
        responder = self.client.post(
            "/responders/", json={"full_name": "Responder", "role": "Medical"}
        ).json()
        self.assertEqual(
            self.client.patch(f"/responders/{responder['id']}", json={"availability": "maybe"}).status_code,
            422,
        )
        self.assertEqual(
            self.client.patch(
                f"/responders/{responder['id']}", json={"assigned_incident_id": 999}
            ).status_code,
            404,
        )

    def test_non_authority_cannot_use_authority_dependency(self):
        self.user.role = RoleEnum.citizen
        with self.assertRaises(HTTPException) as raised:
            deps.get_current_authority(self.user)
        self.assertEqual(raised.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
