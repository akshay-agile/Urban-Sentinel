"""Regression coverage for the camera endpoint's string device identifier."""
import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

import numpy as np
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.api.routes import camera as camera_route
from app.db.base import Base
from app.models.device import Device


class CameraDeviceLookupTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.device = Device(
            id=4,
            device_id="camera_1",
            label="Urban Sentinel Camera 1",
            latitude=12.9716,
            longitude=77.5946,
            is_active=True,
        )
        self.db.add(self.device)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def make_upload(self):
        async def read():
            return b"frame-bytes"

        return SimpleNamespace(
            read=read,
            filename="frame.jpg",
            content_type="image/jpeg",
        )

    def test_active_camera_primary_key_4_resolves_by_string_device_id(self):
        async def call_endpoint(device_id):
            with (
                patch.object(camera_route.cv2, "imdecode", return_value=np.zeros((8, 8, 3), dtype=np.uint8)),
                patch.object(camera_route, "run_inference", return_value={}),
                patch.object(camera_route.temporal_confirmation, "reset", new_callable=AsyncMock),
            ):
                return await camera_route.receive_frame(
                    device_id=device_id,
                    file=self.make_upload(),
                    db=self.db,
                )

        response = asyncio.run(call_endpoint("camera_1"))
        self.assertEqual(self.device.id, 4)
        self.assertEqual(response["device_id"], "camera_1")

    def test_database_primary_key_is_not_the_camera_device_identifier(self):
        async def call_endpoint():
            with self.assertRaises(HTTPException) as error:
                await camera_route.receive_frame(
                    device_id="4",
                    file=self.make_upload(),
                    db=self.db,
                )
            return error.exception

        error = asyncio.run(call_endpoint())
        self.assertEqual(error.status_code, 404)
        self.assertEqual(error.detail, "Camera device not found. Register it first.")


if __name__ == "__main__":
    unittest.main()
