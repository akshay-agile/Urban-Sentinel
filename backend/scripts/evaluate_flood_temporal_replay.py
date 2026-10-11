"""Offline, no-dispatch replay evaluator for Urban Sentinel flood detections.

Manifest columns:
  clip_id,camera_id,recording_group,split,media_type,path,clip_label,input_fps,labels,events_json

media_type is video, frames (a directory of ordered images), or still. Paths may
be absolute or relative to the manifest. For still images, `labels` is a `|`
separated list of Flood and/or Waterlogging; leave it empty for a verified
negative. Video/frame clips use events_json, a JSON list of objects with
event_id, class (Flood or Waterlogging), start_seconds, and end_seconds. A
verified-negative clip must have no annotated events. Do not mix frames from a
recording session across splits. This script deliberately never imports the
camera route, database, dispatch, WebSocket, or notification code.

Example from backend/:
  .venv/Scripts/python.exe scripts/evaluate_flood_temporal_replay.py \
    --manifest .experiments/flood_temporal_replay_20261011/manifest.csv \
    --split test \
    --output-dir .experiments/flood_temporal_replay_20261011/run_001
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import logging
import math
import re
import sys
from collections import Counter
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, Iterator

import cv2

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}
FLOOD_CLASSES = {"flood": "Flood", "waterlogging": "Waterlogging"}
MANIFEST_COLUMNS = {
    "clip_id", "camera_id", "recording_group", "split", "media_type",
    "path", "clip_label", "input_fps", "labels", "events_json",
}
FRAME_COLUMNS = (
    "clip_id", "camera_id", "recording_group", "split", "media_type",
    "frame_index", "timestamp_seconds", "raw_predictions_json",
    "qualifying_flood_classes_json", "accepted_classification",
    "consecutive_positive_count", "simulated_trigger",
    "simulated_trigger_classes_json",
)
LOGGER = logging.getLogger("urban_sentinel.flood_temporal_replay")


def _natural_path_key(path: Path) -> tuple:
    return tuple(
        int(part) if part.isdigit() else part.casefold()
        for part in re.split(r"(\d+)", path.name)
    )


@dataclass(frozen=True)
class ReplayClip:
    clip_id: str
    camera_id: str
    recording_group: str
    split: str
    media_type: str
    path: Path
    clip_label: str
    input_fps: float | None
    labels: frozenset[str]
    events: tuple[dict, ...]


@dataclass(frozen=True)
class ReplayFrame:
    frame_index: int
    timestamp_seconds: float
    image: object


def _class_name(value: str) -> str:
    normalized = value.strip().lower()
    if normalized not in FLOOD_CLASSES:
        raise ValueError(f"Unsupported Flood dataset class: {value!r}")
    return FLOOD_CLASSES[normalized]


def _parse_events(raw: str, clip_id: str) -> tuple[dict, ...]:
    if not raw.strip():
        return ()
    try:
        values = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{clip_id}: events_json is not valid JSON: {exc}") from exc
    if not isinstance(values, list):
        raise ValueError(f"{clip_id}: events_json must be a JSON array")
    events = []
    seen_ids = set()
    for index, value in enumerate(values):
        if not isinstance(value, dict):
            raise ValueError(f"{clip_id}: event {index} must be an object")
        event_id = str(value.get("event_id", "")).strip()
        if not event_id or event_id in seen_ids:
            raise ValueError(f"{clip_id}: event IDs must be non-empty and unique")
        seen_ids.add(event_id)
        event_class = _class_name(str(value.get("class", "")))
        try:
            start = float(value["start_seconds"])
            end = float(value["end_seconds"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"{clip_id}/{event_id}: start_seconds and end_seconds are required") from exc
        if not math.isfinite(start) or not math.isfinite(end) or start < 0 or end < start:
            raise ValueError(f"{clip_id}/{event_id}: invalid event interval")
        events.append({
            "event_id": event_id,
            "class": event_class,
            "start_seconds": start,
            "end_seconds": end,
        })
    return tuple(events)


def load_manifest(path: Path, split: str) -> list[ReplayClip]:
    if not path.is_file():
        raise ValueError(f"Manifest does not exist: {path}")
    clips: list[ReplayClip] = []
    seen_ids = set()
    group_splits: dict[str, str] = {}
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing = MANIFEST_COLUMNS - set(reader.fieldnames or ())
        if missing:
            raise ValueError(f"Manifest is missing columns: {', '.join(sorted(missing))}")
        for row in reader:
            clip_id = row["clip_id"].strip()
            if not clip_id or clip_id in seen_ids:
                raise ValueError("clip_id values must be non-empty and unique")
            seen_ids.add(clip_id)
            row_split = row["split"].strip()
            recording_group = row["recording_group"].strip()
            if not recording_group or not row_split:
                raise ValueError(f"{clip_id}: split and recording_group are required")
            prior_split = group_splits.setdefault(recording_group, row_split)
            if prior_split != row_split:
                raise ValueError(
                    f"Recording group {recording_group!r} occurs in both {prior_split!r} and {row_split!r} splits"
                )
            if row_split != split:
                continue
            media_type = row["media_type"].strip().lower()
            if media_type not in {"video", "frames", "still"}:
                raise ValueError(f"{clip_id}: media_type must be video, frames, or still")
            clip_label = row["clip_label"].strip().lower()
            if clip_label not in {"verified_negative", "labeled_hazard", "unannotated"}:
                raise ValueError(f"{clip_id}: unsupported clip_label {clip_label!r}")
            raw_path = Path(row["path"].strip())
            media_path = raw_path if raw_path.is_absolute() else (path.parent / raw_path).resolve()
            if not media_path.exists():
                raise ValueError(f"{clip_id}: media path does not exist: {media_path}")
            if media_type == "frames" and not media_path.is_dir():
                raise ValueError(f"{clip_id}: frames path must be a directory")
            if media_type in {"video", "still"} and not media_path.is_file():
                raise ValueError(f"{clip_id}: {media_type} path must be a file")
            fps_text = row["input_fps"].strip()
            input_fps = float(fps_text) if fps_text else None
            if input_fps is not None and (not math.isfinite(input_fps) or input_fps <= 0):
                raise ValueError(f"{clip_id}: input_fps must be positive")
            if media_type == "frames" and input_fps is None:
                raise ValueError(f"{clip_id}: ordered frame directories require input_fps for timestamps")
            labels = frozenset(
                _class_name(item) for item in row["labels"].split("|") if item.strip()
            )
            events = _parse_events(row["events_json"], clip_id)
            if media_type == "still" and events:
                raise ValueError(f"{clip_id}: still-image labels belong in labels, not events_json")
            if clip_label == "verified_negative" and (labels or events):
                raise ValueError(f"{clip_id}: verified-negative samples cannot have hazard labels/events")
            if clip_label == "labeled_hazard" and media_type == "still" and not labels:
                raise ValueError(f"{clip_id}: labeled-hazard still image needs labels")
            if clip_label == "labeled_hazard" and media_type != "still" and not events:
                raise ValueError(f"{clip_id}: labeled-hazard clip needs event annotations")
            if clip_label == "unannotated" and (labels or events):
                raise ValueError(f"{clip_id}: unannotated samples cannot include ground-truth labels")
            clips.append(ReplayClip(
                clip_id=clip_id,
                camera_id=row["camera_id"].strip() or clip_id,
                recording_group=row["recording_group"].strip(),
                split=row_split,
                media_type=media_type,
                path=media_path,
                clip_label=clip_label,
                input_fps=input_fps,
                labels=labels,
                events=events,
            ))
    if not clips:
        raise ValueError(f"Manifest has no clips in split {split!r}")
    return clips


def iter_clip_frames(clip: ReplayClip, sample_fps: float) -> Iterator[ReplayFrame]:
    if clip.media_type == "still":
        image = cv2.imread(str(clip.path), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError(f"Unreadable still image: {clip.path}")
        yield ReplayFrame(0, 0.0, image)
        return

    if clip.media_type == "frames":
        paths = sorted((
            item for item in clip.path.iterdir()
            if item.is_file() and item.suffix.lower() in IMAGE_EXTENSIONS
        ), key=_natural_path_key)
        if not paths:
            raise ValueError(f"No supported image frames in {clip.path}")
        fps = clip.input_fps
        next_sample = 0.0
        sampled_index = 0
        for source_index, frame_path in enumerate(paths):
            timestamp = source_index / fps
            if timestamp + 1e-9 < next_sample:
                continue
            image = cv2.imread(str(frame_path), cv2.IMREAD_COLOR)
            if image is None:
                LOGGER.warning("Skipping unreadable frame %s", frame_path)
                continue
            yield ReplayFrame(sampled_index, timestamp, image)
            sampled_index += 1
            next_sample += 1.0 / sample_fps
        return

    capture = cv2.VideoCapture(str(clip.path))
    if not capture.isOpened():
        capture.release()
        raise ValueError(f"Could not open video: {clip.path}")
    try:
        fps = clip.input_fps or float(capture.get(cv2.CAP_PROP_FPS))
        if not math.isfinite(fps) or fps <= 0:
            raise ValueError(f"{clip.clip_id}: video FPS unavailable; set input_fps in manifest")
        next_sample = 0.0
        sampled_index = 0
        source_index = 0
        while True:
            ok, image = capture.read()
            if not ok:
                break
            timestamp = source_index / fps
            source_index += 1
            if timestamp + 1e-9 < next_sample:
                continue
            yield ReplayFrame(sampled_index, timestamp, image)
            sampled_index += 1
            next_sample += 1.0 / sample_fps
        if sampled_index == 0:
            raise ValueError(f"Video contains no decodable frames: {clip.path}")
    finally:
        capture.release()


def _box_value(value) -> float:
    return float(value.item() if hasattr(value, "item") else value)


def extract_detections(results: dict, frame_shape: tuple[int, ...], qualifier: Callable[[dict], bool]) -> list[dict]:
    height, width = frame_shape[:2]
    detections = []
    for model_name, model_results in results.items():
        if not model_results:
            continue
        result = model_results[0]
        for box in result.boxes:
            class_id = int(box.cls[0])
            class_name = str(result.names[class_id])
            confidence = _box_value(box.conf[0])
            raw_coords = box.xyxy[0]
            coords = raw_coords.tolist() if hasattr(raw_coords, "tolist") else raw_coords
            x1, y1, x2, y2 = (float(value) for value in coords)
            detection = {
                "model": model_name,
                "class": class_name,
                "confidence": confidence,
                "bbox_area_fraction": max(0.0, x2 - x1) * max(0.0, y2 - y1) / (width * height),
            }
            detection["qualifying"] = bool(qualifier(detection))
            detections.append(detection)
    return detections


def _classification_name(classification) -> str | None:
    if classification is None:
        return None
    value = classification.incident_type
    return str(getattr(value, "value", value))


async def evaluate_clip(
    clip: ReplayClip,
    frames: Iterable[ReplayFrame],
    *,
    run_inference: Callable,
    classifier: Callable,
    qualifier: Callable[[dict], bool],
    confirmation_factory: Callable,
    camera_state_id: int,
) -> tuple[list[dict], dict]:
    """Replay frames against production decisions and temporal state only."""
    confirmation = confirmation_factory()
    output_rows = []
    frame_class_hits: Counter[str] = Counter()
    trigger_times: list[float] = []
    trigger_classes: list[set[str]] = []
    streak_count = 0
    streak_hazard: str | None = None
    streak_classes: set[str] = set()
    last_timestamp = -1.0
    for frame in frames:
        if frame.timestamp_seconds < last_timestamp:
            raise ValueError(f"{clip.clip_id}: frame timestamps must be ordered")
        last_timestamp = frame.timestamp_seconds
        detections = extract_detections(run_inference(frame.image), frame.image.shape, qualifier)
        qualifying_flood_classes = sorted({
            _class_name(item["class"])
            for item in detections
            if item["model"] == "flood" and item["qualifying"]
            and item["class"].strip().lower() in FLOOD_CLASSES
        })
        for class_name in qualifying_flood_classes:
            frame_class_hits[class_name] += 1

        classification = classifier(detections)
        hazard = _classification_name(classification)
        triggered = False
        simulated_classes: set[str] = set()
        if classification is None:
            await confirmation.reset(camera_state_id)
            streak_count = 0
            streak_hazard = None
            streak_classes.clear()
        else:
            if hazard != streak_hazard:
                streak_count = 1
                streak_hazard = hazard
                streak_classes = set(qualifying_flood_classes)
            else:
                streak_count = min(streak_count + 1, confirmation.confirmation_frames)
                streak_classes.update(qualifying_flood_classes)
            confirmed = await confirmation.process(camera_state_id, classification)
            if confirmed is not None and _classification_name(confirmed) == "flood":
                triggered = True
                simulated_classes = set(streak_classes)
                trigger_times.append(frame.timestamp_seconds)
                trigger_classes.append(simulated_classes)

        output_rows.append({
            "clip_id": clip.clip_id,
            "camera_id": clip.camera_id,
            "recording_group": clip.recording_group,
            "split": clip.split,
            "media_type": clip.media_type,
            "frame_index": frame.frame_index,
            "timestamp_seconds": round(frame.timestamp_seconds, 6),
            "raw_predictions_json": json.dumps([
                {"model": item["model"], "class": item["class"],
                 "confidence": round(item["confidence"], 6), "qualifying": item["qualifying"]}
                for item in detections
            ], separators=(",", ":")),
            "qualifying_flood_classes_json": json.dumps(qualifying_flood_classes),
            "accepted_classification": hazard or "none",
            "consecutive_positive_count": streak_count,
            "simulated_trigger": str(triggered).lower(),
            "simulated_trigger_classes_json": json.dumps(sorted(simulated_classes)),
        })

    duration = _estimate_duration(clip)
    summary = {
        "clip_id": clip.clip_id,
        "camera_id": clip.camera_id,
        "recording_group": clip.recording_group,
        "split": clip.split,
        "media_type": clip.media_type,
        "clip_label": clip.clip_label,
        "frames_processed": len(output_rows),
        "duration_seconds_observed": round(duration, 6),
        "simulated_flood_triggers": len(trigger_times),
        "simulated_trigger_timestamps_seconds": trigger_times,
        "qualifying_flood_class_frames": dict(frame_class_hits),
        "ground_truth_still_classes": sorted(clip.labels),
        "events": [],
    }
    for event in clip.events:
        matching_frame_times = [
            row["timestamp_seconds"] for row in output_rows
            if event["start_seconds"] <= row["timestamp_seconds"] <= event["end_seconds"]
            and event["class"] in json.loads(row["qualifying_flood_classes_json"])
        ]
        matching_trigger_times = [
            timestamp for timestamp, classes in zip(trigger_times, trigger_classes)
            if event["start_seconds"] <= timestamp <= event["end_seconds"]
            and (not classes or event["class"] in classes)
        ]
        first_trigger = min(matching_trigger_times) if matching_trigger_times else None
        summary["events"].append({
            **event,
            "class_evidence_detected": bool(matching_frame_times),
            "class_evidence_first_seconds": min(matching_frame_times) if matching_frame_times else None,
            "confirmed_trigger_detected": first_trigger is not None,
            "detection_delay_seconds": (
                round(first_trigger - event["start_seconds"], 6) if first_trigger is not None else None
            ),
        })
    if clip.media_type == "still" and clip.clip_label != "unannotated":
        predicted = set(summary["qualifying_flood_class_frames"])
        summary["still_class_confusion"] = {
            class_name: {
                "ground_truth": class_name in clip.labels,
                "predicted": class_name in predicted,
            }
            for class_name in FLOOD_CLASSES.values()
        }
    return output_rows, summary


def _estimate_duration(clip: ReplayClip) -> float | None:
    if clip.media_type == "still":
        return 0.0
    if clip.media_type == "frames":
        frame_count = sum(
            1 for item in clip.path.iterdir()
            if item.is_file() and item.suffix.lower() in IMAGE_EXTENSIONS
        )
        return frame_count / clip.input_fps if clip.input_fps else None
    capture = cv2.VideoCapture(str(clip.path))
    try:
        fps = clip.input_fps or float(capture.get(cv2.CAP_PROP_FPS))
        frame_count = float(capture.get(cv2.CAP_PROP_FRAME_COUNT))
        if not math.isfinite(fps) or fps <= 0 or not math.isfinite(frame_count) or frame_count <= 0:
            return None
        return frame_count / fps
    finally:
        capture.release()


@contextmanager
def experimental_flood_threshold(inference_module, threshold: float | None):
    """Temporarily override the Flood threshold in this evaluator process only."""
    original = inference_module.MODEL_THRESHOLDS
    if threshold is None:
        yield dict(original)
        return
    replacement = dict(original)
    replacement["flood"] = threshold
    inference_module.MODEL_THRESHOLDS = replacement
    try:
        yield dict(replacement)
    finally:
        inference_module.MODEL_THRESHOLDS = original


def _load_components():
    # Delayed until evaluation starts: importing this script for tests does not
    # load YOLO weights or import database/network/notification modules.
    from app.ai import inference
    from app.services.temporal_confirmation import TemporalConfirmation

    return inference, TemporalConfirmation


def aggregate_metrics(summaries: list[dict]) -> dict:
    still = [item for item in summaries if item["media_type"] == "still"]
    still_metrics = {}
    for class_name in FLOOD_CLASSES.values():
        tp = fp = fn = tn = 0
        for item in still:
            if "still_class_confusion" not in item:
                continue
            values = item["still_class_confusion"][class_name]
            gt, predicted = values["ground_truth"], values["predicted"]
            tp += int(gt and predicted)
            fp += int(not gt and predicted)
            fn += int(gt and not predicted)
            tn += int(not gt and not predicted)
        still_metrics[class_name] = {
            "tp_images": tp, "fp_images": fp, "fn_images": fn, "tn_images": tn,
            "precision": _ratio(tp, tp + fp),
            "recall": _ratio(tp, tp + fn),
            "false_positive_rate": _ratio(fp, fp + tn),
            "false_negative_rate": _ratio(fn, fn + tp),
        }

    video = [item for item in summaries if item["media_type"] != "still"]
    negative = [item for item in video if item["clip_label"] == "verified_negative"]
    events = [event for item in video for event in item["events"]]
    class_metrics = {}
    for class_name in FLOOD_CLASSES.values():
        class_events = [event for event in events if event["class"] == class_name]
        detected = sum(event["class_evidence_detected"] for event in class_events)
        confirmed = sum(event["confirmed_trigger_detected"] for event in class_events)
        delays = [event["detection_delay_seconds"] for event in class_events if event["detection_delay_seconds"] is not None]
        class_metrics[class_name] = {
            "annotated_events": len(class_events),
            "events_with_class_evidence": detected,
            "class_evidence_recall": _ratio(detected, len(class_events)),
            "events_with_confirmed_trigger": confirmed,
            "confirmed_event_recall": _ratio(confirmed, len(class_events)),
            "mean_detection_delay_seconds": (sum(delays) / len(delays)) if delays else None,
        }
    negative_durations = [item["duration_seconds_observed"] for item in negative]
    negative_hours = (
        sum(negative_durations) / 3600.0
        if all(duration is not None for duration in negative_durations)
        else None
    )
    negative_triggers = sum(item["simulated_flood_triggers"] for item in negative)
    return {
        "still_image_metrics_by_class": still_metrics,
        "ordered_video_metrics": {
            "negative_clips": len(negative),
            "negative_clip_hours": negative_hours,
            "simulated_false_incident_triggers": negative_triggers,
            "false_triggers_per_negative_clip": _ratio(negative_triggers, len(negative)),
            "false_triggers_per_negative_camera_hour": (
                _ratio(negative_triggers, negative_hours) if negative_hours is not None else None
            ),
            "events_by_class": class_metrics,
        },
        "annotation_coverage": {
            "still_images_with_ground_truth": sum("still_class_confusion" in item for item in still),
            "video_clips_with_event_annotations": sum(bool(item["events"]) for item in video),
            "video_clips_without_event_annotations": sum(not item["events"] for item in video),
            "note": "Null metrics indicate missing denominator/annotations; no rate is inferred.",
        },
    }


def _ratio(numerator: int | float, denominator: int | float) -> float | None:
    return numerator / denominator if denominator else None


def write_outputs(output_dir: Path, frame_rows: list[dict], summaries: list[dict], metrics: dict, thresholds: dict) -> None:
    output_dir.mkdir(parents=True, exist_ok=False)
    with (output_dir / "frames.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FRAME_COLUMNS)
        writer.writeheader()
        writer.writerows(frame_rows)
    payload = {
        "thresholds_used": thresholds,
        "clips": summaries,
        "metrics": metrics,
        "safety": {
            "dispatch_called": False,
            "database_used": False,
            "network_used": False,
            "notifications_sent": False,
        },
    }
    (output_dir / "summary.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--split", default="test")
    parser.add_argument("--sample-fps", type=float, default=2.0)
    parser.add_argument("--flood-threshold", type=float, help="Experimental process-only override; applies to Flood and Waterlogging")
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args(argv)
    if args.sample_fps <= 0 or not math.isfinite(args.sample_fps):
        parser.error("--sample-fps must be a positive finite value")
    if args.flood_threshold is not None and not 0.0 <= args.flood_threshold <= 1.0:
        parser.error("--flood-threshold must be between 0 and 1")
    if args.output_dir.exists():
        parser.error("--output-dir already exists; choose a new run directory to avoid overwriting results")
    return args


async def _run_evaluation(args: argparse.Namespace, clips: list[ReplayClip]) -> tuple[list[dict], list[dict], dict, dict]:
    inference, confirmation_class = _load_components()
    frame_rows = []
    summaries = []
    state_id = 0
    with experimental_flood_threshold(inference, args.flood_threshold) as thresholds:
        for clip in clips:
            state_id += 1  # A clip gets its own temporal state; clips never stitch.
            rows, summary = await evaluate_clip(
                clip,
                iter_clip_frames(clip, args.sample_fps),
                run_inference=inference.run_inference,
                classifier=inference.classify_visual_detection,
                qualifier=inference.is_qualified_hazard_detection,
                confirmation_factory=confirmation_class,
                camera_state_id=state_id,
            )
            frame_rows.extend(rows)
            summaries.append(summary)
            LOGGER.info("%s: %d sampled frames, %d simulated Flood triggers",
                        clip.clip_id, summary["frames_processed"], summary["simulated_flood_triggers"])
    metrics = aggregate_metrics(summaries)
    return frame_rows, summaries, metrics, thresholds


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    args = parse_args(argv)
    clips = load_manifest(args.manifest, args.split)
    frame_rows, summaries, metrics, thresholds = asyncio.run(_run_evaluation(args, clips))
    write_outputs(args.output_dir, frame_rows, summaries, metrics, thresholds)
    print(f"Clips evaluated: {len(summaries)}")
    print(f"Frames evaluated: {len(frame_rows)}")
    print(f"Results: {args.output_dir.resolve()}")
    print(json.dumps(metrics, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
