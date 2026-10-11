import ast
import csv
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from app.models.enums import IncidentTypeEnum, SeverityEnum
from app.services.incident_engine import Classification
from app.services.temporal_confirmation import TemporalConfirmation
from scripts.evaluate_flood_temporal_replay import (
    ReplayClip,
    ReplayFrame,
    evaluate_clip,
    experimental_flood_threshold,
    load_manifest,
)


class FakeBox:
    cls = [0]
    conf = [0.91]
    xyxy = [[10.0, 10.0, 60.0, 60.0]]


class FakeImage:
    shape = (100, 100, 3)

    def __init__(self, positive):
        self.positive = positive


class FloodTemporalReplayTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.frames_dir = self.root / "frames"
        self.frames_dir.mkdir()

    def tearDown(self):
        self.temp_dir.cleanup()

    def clip(self, clip_id="clip-a", label="labeled_hazard"):
        for index in range(6):
            (self.frames_dir / f"{index:03}.jpg").touch()
        return ReplayClip(
            clip_id=clip_id,
            camera_id="camera-test",
            recording_group="session-a",
            split="test",
            media_type="frames",
            path=self.frames_dir,
            clip_label=label,
            input_fps=2.0,
            labels=frozenset(),
            events=(),
        )

    @staticmethod
    def callbacks():
        def run_inference(image):
            if image.positive:
                result = SimpleNamespace(names={0: "Flood"}, boxes=[FakeBox()])
                return {"flood": [result], "fire": [], "accident": []}
            return {"flood": [], "fire": [], "accident": []}

        def qualifier(detection):
            return (
                detection["model"] == "flood"
                and detection["class"].lower() in {"flood", "waterlogging"}
                and detection["confidence"] >= 0.65
            )

        def classifier(detections):
            if any(item.get("qualifying") for item in detections):
                return Classification(IncidentTypeEnum.flood, SeverityEnum.medium, 1500.0)
            return None

        return run_inference, classifier, qualifier

    async def replay(self, positives, clip_id="clip-a", label="labeled_hazard"):
        clip = self.clip(clip_id, label)
        frames = [
            ReplayFrame(index, index / 2, FakeImage(positive))
            for index, positive in enumerate(positives)
        ]
        run_inference, classifier, qualifier = self.callbacks()
        return await evaluate_clip(
            clip,
            frames,
            run_inference=run_inference,
            classifier=classifier,
            qualifier=qualifier,
            confirmation_factory=TemporalConfirmation,
            camera_state_id=1,
        )

    async def test_three_qualifying_frames_make_one_simulated_trigger(self):
        rows, summary = await self.replay([True, True, True, True])
        self.assertEqual([row["consecutive_positive_count"] for row in rows], [1, 2, 3, 3])
        self.assertEqual([row["simulated_trigger"] for row in rows], ["false", "false", "true", "false"])
        self.assertEqual(summary["simulated_flood_triggers"], 1)
        self.assertEqual(rows[0]["qualifying_flood_classes_json"], '["Flood"]')

    async def test_negative_frame_resets_streak_as_production_does(self):
        rows, summary = await self.replay([True, True, False, True, True, True])
        self.assertEqual([row["consecutive_positive_count"] for row in rows], [1, 2, 0, 1, 2, 3])
        self.assertEqual(summary["simulated_flood_triggers"], 1)
        self.assertEqual(rows[-1]["simulated_trigger"], "true")

    async def test_negative_clip_without_qualifying_detections_has_no_trigger(self):
        _, summary = await self.replay([False, False, False, False], label="verified_negative")
        self.assertEqual(summary["simulated_flood_triggers"], 0)

    async def test_temporal_state_does_not_leak_between_clips(self):
        first_rows, first_summary = await self.replay([True, True], clip_id="first")
        second_rows, second_summary = await self.replay([True], clip_id="second")
        self.assertEqual(first_rows[-1]["consecutive_positive_count"], 2)
        self.assertEqual(second_rows[0]["consecutive_positive_count"], 1)
        self.assertEqual(first_summary["simulated_flood_triggers"], 0)
        self.assertEqual(second_summary["simulated_flood_triggers"], 0)

    def test_threshold_override_is_process_local_and_restored(self):
        fake_inference = SimpleNamespace(MODEL_THRESHOLDS={"fire": 0.70, "flood": 0.65, "accident": 0.50})
        original = fake_inference.MODEL_THRESHOLDS
        with experimental_flood_threshold(fake_inference, 0.72) as active:
            self.assertEqual(active["flood"], 0.72)
            self.assertEqual(fake_inference.MODEL_THRESHOLDS["flood"], 0.72)
        self.assertIs(fake_inference.MODEL_THRESHOLDS, original)
        self.assertEqual(fake_inference.MODEL_THRESHOLDS["flood"], 0.65)

    def test_manifest_rejects_recording_group_split_leakage(self):
        media_a = self.root / "a.jpg"
        media_b = self.root / "b.jpg"
        media_a.touch()
        media_b.touch()
        manifest = self.root / "manifest.csv"
        columns = [
            "clip_id", "camera_id", "recording_group", "split", "media_type",
            "path", "clip_label", "input_fps", "labels", "events_json",
        ]
        with manifest.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=columns)
            writer.writeheader()
            for clip_id, split, media in (("a", "train", media_a), ("b", "test", media_b)):
                writer.writerow({
                    "clip_id": clip_id,
                    "camera_id": "camera-test",
                    "recording_group": "same-session",
                    "split": split,
                    "media_type": "still",
                    "path": str(media),
                    "clip_label": "unannotated",
                    "input_fps": "",
                    "labels": "",
                    "events_json": "",
                })
        with self.assertRaisesRegex(ValueError, "occurs in both"):
            load_manifest(manifest, "test")

    def test_evaluator_has_no_database_network_dispatch_or_notification_imports(self):
        source = Path(__file__).resolve().parents[1] / "scripts" / "evaluate_flood_temporal_replay.py"
        tree = ast.parse(source.read_text(encoding="utf-8"))
        forbidden_modules = ("sqlalchemy", "httpx", "requests", "firebase_admin", "app.api", "app.crud")
        forbidden_calls = {"dispatch_classification", "send_notification", "send_push"}
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imported = [alias.name for alias in node.names]
                self.assertFalse(any(name.startswith(forbidden_modules) for name in imported))
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                self.assertFalse(module.startswith(forbidden_modules))
            elif isinstance(node, ast.Call):
                called = node.func.id if isinstance(node.func, ast.Name) else ""
                self.assertNotIn(called, forbidden_calls)


if __name__ == "__main__":
    unittest.main()
