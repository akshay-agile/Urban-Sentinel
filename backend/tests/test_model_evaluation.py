import csv
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from app.ai.inference import MODEL_THRESHOLDS, is_qualified_hazard_detection
from scripts.evaluate_hazard_models import (
    ImageSample,
    collect_yolo_yaml_samples,
    extract_model_predictions,
    make_report_row,
    summarize_rows,
    write_csv,
)


class ModelEvaluationTests(unittest.TestCase):
    def test_predictions_use_shared_production_thresholds_and_classes(self):
        cases = (
            ("fire", "fire", 0.6999, False),
            ("fire", "smoke", 0.70, True),
            ("fire", "phone", 0.99, False),
            ("flood", "flood", 0.6499, False),
            ("flood", "waterlogging", 0.65, True),
            ("accident", "accident", 0.4999, False),
            ("accident", "accident", 0.50, True),
        )
        for model, class_name, confidence, expected in cases:
            with self.subTest(model=model, class_name=class_name, confidence=confidence):
                self.assertEqual(
                    is_qualified_hazard_detection({
                        "model": model,
                        "class": class_name,
                        "confidence": confidence,
                    }),
                    expected,
                )

    def test_csv_and_summary_count_only_qualified_verified_negative_predictions(self):
        sample = ImageSample(
            Path("ordinary.jpg"), "ordinary_1", "", "verified_negative"
        )
        predictions = extract_model_predictions(
            "flood",
            {
                "flood": [SimpleNamespace(
                    names={0: "Flood", 1: "keyboard"},
                    boxes=[
                        SimpleNamespace(cls=[0], conf=[0.66]),
                        SimpleNamespace(cls=[1], conf=[0.99]),
                    ],
                )]
            },
            is_qualified_hazard_detection,
        )
        flood_row = make_report_row(
            sample, "flood", MODEL_THRESHOLDS["flood"], predictions
        )
        fire_row = make_report_row(
            sample, "fire", MODEL_THRESHOLDS["fire"], []
        )
        positive_row = make_report_row(
            ImageSample(Path("hazard.jpg"), "known_hazard_1", "", "known_hazard_unlabeled"),
            "flood",
            MODEL_THRESHOLDS["flood"],
            [{"class": "Flood", "confidence": 0.91, "qualifying": True}],
        )
        rows = [flood_row, fire_row, positive_row]

        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "report.csv"
            write_csv(rows, output)
            with output.open(newline="", encoding="utf-8") as csv_file:
                saved_rows = list(csv.DictReader(csv_file))

        self.assertEqual(len(saved_rows), 3)
        self.assertEqual(saved_rows[0]["false_positive"], "true")
        self.assertEqual(saved_rows[2]["false_positive"], "")
        summary = summarize_rows(rows)
        self.assertEqual(summary["flood"]["verified_negative_images"], 1)
        self.assertEqual(summary["flood"]["false_positive_images"], 1)
        self.assertEqual(summary["flood"]["qualifying_detections_on_negatives"], 1)
        self.assertEqual(summary["flood"]["known_hazard_images"], 1)
        self.assertEqual(summary["fire"]["false_positive_images"], 0)

    def test_other_dataset_empty_labels_do_not_create_cross_model_false_positives(self):
        fire_negative = ImageSample(
            Path("fire-negative.jpg"),
            "fire_dataset",
            "test",
            "verified_negative",
            "fire",
        )
        predictions = [{"class": "Flood", "confidence": 0.9, "qualifying": True}]

        fire_row = make_report_row(
            fire_negative, "fire", MODEL_THRESHOLDS["fire"], []
        )
        flood_row = make_report_row(
            fire_negative, "flood", MODEL_THRESHOLDS["flood"], predictions
        )

        self.assertEqual(fire_row["label_status"], "verified_negative")
        self.assertEqual(flood_row["label_status"], "unverified_other_dataset")
        self.assertEqual(flood_row["false_positive"], "")
        summary = summarize_rows([fire_row, flood_row])
        self.assertEqual(summary["fire"]["verified_negative_images"], 1)
        self.assertEqual(summary["flood"]["verified_negative_images"], 0)

    def test_dataset_yaml_test_split_and_empty_labels_are_used(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            images = root / "test" / "images"
            labels = root / "test" / "labels"
            images.mkdir(parents=True)
            labels.mkdir(parents=True)
            (images / "ordinary.jpg").touch()
            (images / "hazard.jpg").touch()
            (labels / "ordinary.txt").write_text("  \n", encoding="utf-8")
            (labels / "hazard.txt").write_text("0 0.5 0.5 0.2 0.2\n", encoding="utf-8")
            yaml_path = root / "data.yaml"
            yaml_path.write_text(
                f"path: {root.as_posix()}\ntest: test/images\n",
                encoding="utf-8",
            )

            samples, omitted = collect_yolo_yaml_samples(
                yaml_path, model_name="flood", split="test"
            )

        statuses = {sample.path.name: sample.label_status for sample in samples}
        self.assertEqual(omitted, 0)
        self.assertEqual(statuses["ordinary.jpg"], "verified_negative")
        self.assertEqual(statuses["hazard.jpg"], "known_hazard_labeled")
        self.assertTrue(all(sample.label_model == "flood" for sample in samples))


if __name__ == "__main__":
    unittest.main()
