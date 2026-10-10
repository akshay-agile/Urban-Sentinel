import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import numpy as np

from app.ai.inference import classify_visual_detection, is_qualified_hazard_detection
from app.api.routes import camera as camera_route
from scripts.live_camera_visualizer import draw_detections


class HazardDetectionFilteringTests(unittest.TestCase):
    def test_raw_confidence_below_each_threshold_is_rejected(self):
        cases = (
            ("fire", "Fire", 0.69996),
            ("flood", "Flood", 0.64996),
            ("accident", "Accident", 0.49996),
        )
        for model, class_name, confidence in cases:
            with self.subTest(model=model):
                item = {"model": model, "class": class_name, "confidence": confidence}
                self.assertFalse(is_qualified_hazard_detection(item))
                self.assertIsNone(classify_visual_detection([item]))

    def test_confidence_at_or_above_each_threshold_is_accepted(self):
        cases = (
            ("fire", "Smoke", 0.70, 0.71),
            ("flood", "Waterlogging", 0.65, 0.66),
            ("accident", "Accident", 0.50, 0.51),
        )
        for model, class_name, threshold, above in cases:
            for confidence in (threshold, above):
                with self.subTest(model=model, confidence=confidence):
                    item = {"model": model, "class": class_name, "confidence": confidence}
                    self.assertTrue(is_qualified_hazard_detection(item))
                    self.assertIsNotNone(classify_visual_detection([item]))

    def test_visualizer_draws_only_qualified_classes(self):
        cases = {
            "fire": [("fire", 0.69996), ("phone", 0.99), ("smoke", 0.70)],
            "flood": [("flood", 0.64996), ("keyboard", 0.99), ("waterlogging", 0.65)],
            "accident": [("accident", 0.49996), ("pen", 0.99), ("accident", 0.50)],
        }
        results = {}
        for model, detections in cases.items():
            boxes = []
            names = {}
            for index, (class_name, confidence) in enumerate(detections):
                names[index] = class_name
                boxes.append(SimpleNamespace(
                    cls=[index], conf=[confidence], xyxy=[np.array([1, 2, 10, 20])]
                ))
            results[model] = [SimpleNamespace(boxes=boxes, names=names)]

        with patch("scripts.live_camera_visualizer.cv2.rectangle"), patch(
            "scripts.live_camera_visualizer.cv2.getTextSize", return_value=((20, 10), 2)
        ), patch("scripts.live_camera_visualizer.cv2.putText"):
            count = draw_detections(np.zeros((32, 32, 3), dtype=np.uint8), results)

        self.assertEqual(count, 3)

    def test_camera_route_classifies_unrounded_confidence(self):
        box = SimpleNamespace(cls=[0], conf=[0.64996], xyxy=[np.array([0, 0, 50, 50])])
        model_result = SimpleNamespace(boxes=[box], names={0: "Flood"})
        device = SimpleNamespace(id=1, device_id="camera-test", is_active=True)

        async def read_upload():
            return b"image-bytes"

        upload = SimpleNamespace(read=read_upload, filename="frame.jpg", content_type="image/jpeg")

        async def run_route():
            with (
                patch.object(camera_route.crud.device, "get_by_device_id", return_value=device),
                patch.object(camera_route.cv2, "imdecode", return_value=np.zeros((100, 100, 3), dtype=np.uint8)),
                patch.object(camera_route, "run_inference", return_value={"flood": [model_result]}),
                patch.object(camera_route.temporal_confirmation, "reset", new_callable=AsyncMock) as reset,
            ):
                response = await camera_route.receive_frame("camera-test", upload, db=object())
                self.assertIsNone(response["classification"])
                self.assertEqual(response["detections"][0]["confidence"], 0.65)
                reset.assert_awaited_once_with(device.id)

        import asyncio
        asyncio.run(run_route())


if __name__ == "__main__":
    unittest.main()
