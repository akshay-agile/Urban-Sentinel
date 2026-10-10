"""Evaluate the existing Urban Sentinel YOLO models on supplied image sets.

Example from the backend directory::

    python scripts/evaluate_hazard_models.py \
      --negative-dir "D:\\evaluation\\ordinary" \
      --positive-dir "D:\\evaluation\\hazards" \
      --fire-dataset-root "D:\\Akshay\\major project\\Project\\Models\\fire\\archive" \
      --fire-splits test \
      --flood-data-yaml "D:\\Akshay\\major project\\Project\\Models\\flood\\dataset\\final\\data.yaml" \
      --accident-data-yaml "D:\\Akshay\\major project\\Project\\Models\\accident\\dataset\\raw\\Accident detection model.v2i.yolov11\\data.yaml" \
      --output "D:\\evaluation\\urban_sentinel_predictions.csv"

Negative directories are treated as manually verified ordinary scenes. Fire
dataset images are classified from their YOLO label files: empty labels are
verified negatives, non-empty labels are known hazard images, and missing
labels remain unverified. Positive-image outputs are descriptive predictions;
this script does not calculate true-positive rates or match boxes to labels.
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

import cv2


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}
MODEL_NAMES = ("fire", "flood", "accident")
CSV_COLUMNS = (
    "source",
    "split",
    "image_path",
    "label_status",
    "model",
    "threshold",
    "raw_detection_count",
    "qualifying_detection_count",
    "false_positive",
    "predictions_json",
)
LOGGER = logging.getLogger("urban_sentinel.model_evaluation")


@dataclass(frozen=True)
class ImageSample:
    path: Path
    source: str
    split: str
    label_status: str
    label_model: str | None = None


def collect_directory_samples(
    directory: Path,
    *,
    source: str,
    label_status: str,
    limit: int | None = None,
) -> tuple[list[ImageSample], int]:
    """Collect images recursively, returning samples and count omitted by limit."""
    if not directory.is_dir():
        raise ValueError(f"Image directory does not exist: {directory}")

    paths = sorted(
        path for path in directory.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )
    omitted = max(0, len(paths) - limit) if limit is not None else 0
    if limit is not None:
        paths = paths[:limit]
    samples = [
        ImageSample(path, source, "", label_status)
        for path in paths
    ]
    return samples, omitted


def collect_fire_dataset_samples(
    dataset_root: Path,
    splits: Iterable[str],
    *,
    limit: int | None = None,
) -> tuple[list[ImageSample], int]:
    """Use the extracted Fire dataset layout without relying on its Kaggle YAML path."""
    data_root = dataset_root / "data"
    if not data_root.is_dir():
        raise ValueError(
            f"Expected extracted Fire dataset directory at {data_root}; "
            "dataset_root should contain data.yaml and data/"
        )

    samples: list[ImageSample] = []
    omitted_total = 0
    for split in splits:
        image_dir = data_root / split / "images"
        label_dir = data_root / split / "labels"
        split_samples, omitted = collect_directory_samples(
            image_dir,
            source="fire_dataset",
            label_status="",
            limit=None,
        )
        omitted_total += omitted
        for sample in split_samples:
            label_path = label_dir / f"{sample.path.stem}.txt"
            if not label_path.is_file():
                status = "unverified_missing_label"
            else:
                status = (
                    "verified_negative"
                    if not label_path.read_text(encoding="utf-8", errors="replace").strip()
                    else "known_hazard_labeled"
                )
            samples.append(ImageSample(sample.path, "fire_dataset", split, status, "fire"))

    samples.sort(key=lambda sample: (sample.split, str(sample.path).casefold()))
    if limit is not None:
        omitted_total += max(0, len(samples) - limit)
        samples = samples[:limit]
    return samples, omitted_total


def collect_yolo_yaml_samples(
    yaml_path: Path,
    *,
    model_name: str,
    split: str = "test",
    limit: int | None = None,
) -> tuple[list[ImageSample], int]:
    """Collect one split using the dataset paths declared by its YOLO YAML."""
    if not yaml_path.is_file():
        raise ValueError(f"Dataset YAML does not exist: {yaml_path}")
    try:
        import yaml
    except ImportError as exc:
        raise RuntimeError("PyYAML is required to read the existing dataset YAML") from exc

    with yaml_path.open(encoding="utf-8") as yaml_file:
        config = yaml.safe_load(yaml_file) or {}
    split_value = config.get(split)
    if not split_value or not isinstance(split_value, str):
        raise ValueError(f"Dataset YAML has no single-directory '{split}' entry: {yaml_path}")

    configured_root = Path(config.get("path") or yaml_path.parent)
    if not configured_root.is_absolute():
        configured_root = (yaml_path.parent / configured_root).resolve()
    image_dir = Path(split_value)
    if not image_dir.is_absolute():
        image_dir = (configured_root / image_dir).resolve()
        # Match Ultralytics' ../ split-path fallback while keeping the YAML read-only.
        if not image_dir.is_dir() and split_value.startswith("../"):
            image_dir = (configured_root / split_value[3:]).resolve()

    samples, omitted = collect_directory_samples(
        image_dir,
        source=f"{model_name}_dataset",
        label_status="",
        limit=limit,
    )
    label_dir = image_dir.parent / "labels"
    scoped_samples = []
    for sample in samples:
        label_path = label_dir / f"{sample.path.stem}.txt"
        if not label_path.is_file():
            status = "unverified_missing_label"
        else:
            status = (
                "verified_negative"
                if not label_path.read_text(encoding="utf-8", errors="replace").strip()
                else "known_hazard_labeled"
            )
        scoped_samples.append(
            ImageSample(sample.path, sample.source, split, status, model_name)
        )
    return scoped_samples, omitted


def extract_model_predictions(
    model_name: str,
    model_results,
    qualifier: Callable[[dict], bool],
) -> list[dict]:
    """Return raw boxes with an explicit production-qualification flag."""
    results = model_results.get(model_name)
    if not results:
        return []

    result = results[0]
    predictions = []
    for box in result.boxes:
        class_id = int(box.cls[0])
        class_name = str(result.names[class_id])
        confidence = float(box.conf[0])
        detection = {
            "model": model_name,
            "class": class_name,
            "confidence": confidence,
        }
        predictions.append({
            "class": class_name,
            "confidence": round(confidence, 6),
            "qualifying": bool(qualifier(detection)),
        })
    return predictions


def make_report_row(
    sample: ImageSample,
    model_name: str,
    threshold: float,
    predictions: list[dict],
) -> dict:
    qualifying_count = sum(item["qualifying"] for item in predictions)
    applies_to_model = sample.label_model is None or sample.label_model == model_name
    label_status = sample.label_status if applies_to_model else "unverified_other_dataset"
    verified_negative = label_status == "verified_negative"
    return {
        "source": sample.source,
        "split": sample.split,
        "image_path": str(sample.path),
        "label_status": label_status,
        "model": model_name,
        "threshold": f"{threshold:.2f}",
        "raw_detection_count": len(predictions),
        "qualifying_detection_count": qualifying_count,
        "false_positive": (
            str(qualifying_count > 0).lower() if verified_negative else ""
        ),
        "predictions_json": json.dumps(predictions, separators=(",", ":")),
    }


def summarize_rows(rows: Iterable[dict]) -> dict[str, dict[str, int | float]]:
    rows = list(rows)
    summary = {}
    for model_name in MODEL_NAMES:
        model_rows = [row for row in rows if row["model"] == model_name]
        negatives = [row for row in model_rows if row["label_status"] == "verified_negative"]
        false_positives = sum(row["false_positive"] == "true" for row in negatives)
        positives = [
            row for row in model_rows
            if row["label_status"].startswith("known_hazard")
        ]
        positive_images_with_predictions = sum(
            int(row["qualifying_detection_count"]) > 0 for row in positives
        )
        summary[model_name] = {
            "verified_negative_images": len(negatives),
            "false_positive_images": false_positives,
            "qualifying_detections_on_negatives": sum(
                int(row["qualifying_detection_count"]) for row in negatives
            ),
            "false_positive_rate": (
                false_positives / len(negatives) if negatives else 0.0
            ),
            "known_hazard_images": len(positives),
            "known_hazard_images_with_qualifying_predictions": positive_images_with_predictions,
        }
    return summary


def write_csv(rows: Iterable[dict], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def evaluate_samples(
    samples: Iterable[ImageSample],
    *,
    run_inference: Callable,
    qualifier: Callable[[dict], bool],
    thresholds: dict[str, float],
) -> tuple[list[dict], list[Path]]:
    rows = []
    skipped = []
    for sample in samples:
        frame = cv2.imread(str(sample.path), cv2.IMREAD_COLOR)
        if frame is None:
            skipped.append(sample.path)
            continue
        try:
            model_results = run_inference(frame)
            image_rows = []
            for model_name in MODEL_NAMES:
                predictions = extract_model_predictions(
                    model_name, model_results, qualifier
                )
                image_rows.append(make_report_row(
                    sample,
                    model_name,
                    thresholds[model_name],
                    predictions,
                ))
            rows.extend(image_rows)
        except Exception:
            LOGGER.exception("Skipping image after inference error: %s", sample.path)
            skipped.append(sample.path)
    return rows, skipped


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--negative-dir",
        type=Path,
        action="append",
        default=[],
        metavar="DIR",
        help="Manually verified ordinary-scene image directory; may be repeated.",
    )
    parser.add_argument(
        "--positive-dir",
        type=Path,
        action="append",
        default=[],
        metavar="DIR",
        help="Known-hazard image directory; may be repeated (no TP rate is computed).",
    )
    parser.add_argument(
        "--fire-dataset-root",
        type=Path,
        help="Extracted Fire dataset root containing data.yaml and data/; YAML is not edited or used for paths.",
    )
    parser.add_argument(
        "--fire-splits",
        nargs="+",
        choices=("train", "val", "test"),
        default=("test",),
        help="Fire dataset splits to include (default: test).",
    )
    parser.add_argument(
        "--flood-data-yaml",
        type=Path,
        help="Flood YOLO dataset YAML; its test image and label directories are read without modification.",
    )
    parser.add_argument(
        "--accident-data-yaml",
        type=Path,
        help="Accident YOLO dataset YAML; its test image and label directories are read without modification.",
    )
    parser.add_argument(
        "--limit-per-source",
        type=int,
        help="Optional maximum images from each supplied directory or the combined Fire splits.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Destination CSV path.",
    )
    args = parser.parse_args(argv)
    if not any((
        args.negative_dir,
        args.positive_dir,
        args.fire_dataset_root,
        args.flood_data_yaml,
        args.accident_data_yaml,
    )):
        parser.error(
            "Supply an image directory, --fire-dataset-root, "
            "--flood-data-yaml, or --accident-data-yaml"
        )
    if args.limit_per_source is not None and args.limit_per_source < 1:
        parser.error("--limit-per-source must be positive")
    return args


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    args = parse_args(argv)

    samples = []
    omitted_by_limit = 0
    for index, directory in enumerate(args.negative_dir, start=1):
        collected, omitted = collect_directory_samples(
            directory,
            source=f"ordinary_{index}",
            label_status="verified_negative",
            limit=args.limit_per_source,
        )
        samples.extend(collected)
        omitted_by_limit += omitted
    for index, directory in enumerate(args.positive_dir, start=1):
        collected, omitted = collect_directory_samples(
            directory,
            source=f"known_hazard_{index}",
            label_status="known_hazard_unlabeled",
            limit=args.limit_per_source,
        )
        samples.extend(collected)
        omitted_by_limit += omitted
    if args.fire_dataset_root:
        collected, omitted = collect_fire_dataset_samples(
            args.fire_dataset_root,
            args.fire_splits,
            limit=args.limit_per_source,
        )
        samples.extend(collected)
        omitted_by_limit += omitted
    for model_name, yaml_path in (
        ("flood", args.flood_data_yaml),
        ("accident", args.accident_data_yaml),
    ):
        if yaml_path:
            collected, omitted = collect_yolo_yaml_samples(
                yaml_path,
                model_name=model_name,
                split="test",
                limit=args.limit_per_source,
            )
            samples.extend(collected)
            omitted_by_limit += omitted

    # Importing inference loads the configured project weights via model_manager.
    from app.ai.inference import MODEL_THRESHOLDS, is_qualified_hazard_detection, run_inference

    rows, skipped = evaluate_samples(
        samples,
        run_inference=run_inference,
        qualifier=is_qualified_hazard_detection,
        thresholds=MODEL_THRESHOLDS,
    )
    write_csv(rows, args.output)
    summaries = summarize_rows(rows)

    print(f"Images evaluated: {len(rows) // len(MODEL_NAMES)}")
    print(f"Images skipped (unreadable/inference error): {len(skipped)}")
    for path in skipped:
        print(f"  SKIPPED: {path}")
    if omitted_by_limit:
        print(f"Images omitted by --limit-per-source: {omitted_by_limit}")
    unverified_by_source = Counter(
        sample.source
        for sample in samples
        if sample.label_status == "unverified_missing_label"
    )
    for source, count in sorted(unverified_by_source.items()):
        print(f"{source} images missing labels (not in FP denominator): {count}")

    print("\nVerified-negative images with >=1 qualifying detection:")
    for model_name in MODEL_NAMES:
        item = summaries[model_name]
        rate = (
            f"{item['false_positive_rate']:.2%}"
            if item["verified_negative_images"]
            else "n/a (no verified negatives)"
        )
        print(
            f"  {model_name}: {item['false_positive_images']}/"
            f"{item['verified_negative_images']} images ({rate}); "
            f"qualifying detections on negatives: "
            f"{item['qualifying_detections_on_negatives']}"
        )
        if item["known_hazard_images"]:
            print(
                "    known hazard images with qualifying predictions: "
                f"{item['known_hazard_images_with_qualifying_predictions']}/"
                f"{item['known_hazard_images']} (descriptive only; not a true-positive rate)"
            )
    print(f"CSV: {args.output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
