"""Route-level temporal-confirmation test using the real YOLO models."""
from io import BytesIO
from pathlib import Path
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from starlette.datastructures import Headers, UploadFile

from app.db.base import Base
from app.models.device import Device
from app.models.enums import IncidentTypeEnum, SeverityEnum
from app.models.incident import Incident
from app.models.notification import Notification
from app.services.temporal_confirmation import temporal_confirmation


PROJECT_ROOT = Path(__file__).resolve().parents[2].parent
MODELS_ROOT = PROJECT_ROOT / "Models"
ACCIDENT_IMAGE = (
    MODELS_ROOT
    / "accident"
    / "dataset"
    / "raw"
    / "Accident detection model.v2i.yolov11"
    / "test"
    / "images"
    / "Accidents-online-video-cutter_com-1-_mp4-143_jpg.rf.94757732b509b5fdf3a7a99b538f0415.jpg"
)
MODEL_WEIGHTS = (
    MODELS_ROOT / "fire" / "best.pt",
    MODELS_ROOT / "flood" / "runs" / "yolo11n_flood_waterlogging-3" / "weights" / "best.pt",
    MODELS_ROOT / "accident" / "runs" / "yolo11n_accident" / "weights" / "best.pt",
)
HAS_LOCAL_MODEL_ASSETS = ACCIDENT_IMAGE.is_file() and all(path.is_file() for path in MODEL_WEIGHTS)

if HAS_LOCAL_MODEL_ASSETS:
    # Importing the camera route loads the project's existing YOLO weights.
    from app.api.routes import camera as camera_route
    from app.services.incident_dispatch import dispatch_classification


@unittest.skipUnless(
    HAS_LOCAL_MODEL_ASSETS,
    "Local YOLO weights and the known accident test image are required",
)
class CameraTemporalIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.device = Device(
            device_id="camera_1",
            label="Temporal test camera",
            latitude=12.9716,
            longitude=77.5946,
            is_active=True,
        )
        self.db.add(self.device)
        self.db.commit()
        await temporal_confirmation.reset(self.device.id)

    async def asyncTearDown(self):
        await temporal_confirmation.reset(self.device.id)
        self.db.close()
        self.engine.dispose()

    async def send_known_frame(self):
        upload = UploadFile(
            filename=ACCIDENT_IMAGE.name,
            file=BytesIO(ACCIDENT_IMAGE.read_bytes()),
            headers=Headers({"content-type": "image/jpeg"}),
        )
        return await camera_route.receive_frame(
            device_id="camera_1",
            file=upload,
            db=self.db,
        )

    def assert_accident_detection(self, response):
        accidents = [
            detection
            for detection in response["detections"]
            if detection["model"] == "accident"
            and detection["class"].lower() == "accident"
        ]
        self.assertTrue(accidents, "Expected the accident model to detect an accident")
        confidence = max(detection["confidence"] for detection in accidents)
        self.assertAlmostEqual(confidence, 0.6958, delta=0.10)
        self.assertEqual(response["classification"]["incident_type"], IncidentTypeEnum.accident.value)
        self.assertEqual(response["classification"]["severity"], "medium")
        self.assertIn("accident region covers", response["classification"]["severity_reason"])
        self.assertAlmostEqual(
            response["classification"]["severity_features"]["largest_region_coverage"],
            0.115,
            delta=0.04,
        )

    def test_classifier_severity_is_unchanged_by_confidence_above_threshold(self):
        visual_region = {
            "model": "accident",
            "class": "Accident",
            "bbox_area_fraction": 0.115,
        }
        lower = camera_route.classify_visual_detection(
            [{**visual_region, "confidence": 0.55}]
        )
        higher = camera_route.classify_visual_detection(
            [{**visual_region, "confidence": 0.90}]
        )

        self.assertEqual(lower.severity, higher.severity)
        self.assertEqual(lower.severity, SeverityEnum.medium)
        self.assertEqual(lower.severity_reason, higher.severity_reason)

    async def test_three_real_positive_frames_dispatch_once_without_touching_existing_db(self):
        # This fresh in-memory database deliberately contains no incident #42;
        # the pre-existing PostgreSQL incident cannot make this test pass.
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Incident)), 0)

        with patch.object(
            camera_route,
            "dispatch_classification",
            wraps=dispatch_classification,
        ) as dispatch_spy:
            first = await self.send_known_frame()
            self.assert_accident_detection(first)
            self.assertIsNone(first["incident"])
            self.assertEqual(dispatch_spy.call_count, 0)
            self.assertEqual(self.db.scalar(select(func.count()).select_from(Incident)), 0)

            second = await self.send_known_frame()
            self.assert_accident_detection(second)
            self.assertIsNone(second["incident"])
            self.assertEqual(dispatch_spy.call_count, 0)
            self.assertEqual(self.db.scalar(select(func.count()).select_from(Incident)), 0)

            third = await self.send_known_frame()
            self.assert_accident_detection(third)
            self.assertIsNotNone(third["incident"])
            self.assertEqual(third["incident"]["incident_type"], IncidentTypeEnum.accident.value)
            self.assertEqual(dispatch_spy.call_count, 1)
            self.assertEqual(self.db.scalar(select(func.count()).select_from(Incident)), 1)

            post_confirmation = await self.send_known_frame()
            self.assert_accident_detection(post_confirmation)
            self.assertIsNone(post_confirmation["incident"])
            self.assertEqual(dispatch_spy.call_count, 1)
            self.assertEqual(self.db.scalar(select(func.count()).select_from(Incident)), 1)

        created = self.db.scalar(select(Incident))
        self.assertEqual(created.device_id, self.device.id)
        self.assertEqual(created.incident_type, IncidentTypeEnum.accident)
        self.assertEqual(
            self.db.scalar(select(func.count()).select_from(Notification)),
            0,
            "The isolated test database has no users, so no notifications or FCM sends occur",
        )


if __name__ == "__main__":
    unittest.main()
