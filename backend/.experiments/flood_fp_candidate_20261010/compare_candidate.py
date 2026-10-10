import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

import cv2
from ultralytics import YOLO

BACKEND = Path(r"D:\Akshay\major project\Project\urban-sentinel\backend")
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))
from app.ai.inference import MODEL_THRESHOLDS, is_qualified_hazard_detection

ROOT = Path(__file__).resolve().parent
ORIGINAL = Path(r"D:\Akshay\major project\Project\Models\flood\runs\yolo11n_flood_waterlogging-3\weights\best.pt")
CANDIDATE = ROOT / "runs" / "flood_fp_finetune_3ep" / "weights" / "best.pt"
MANIFEST = ROOT / "comparison_manifest.csv"
OUTPUT = ROOT / "candidate_comparison.csv"
THRESHOLD = MODEL_THRESHOLDS["flood"]


def main():
    original_model = YOLO(str(ORIGINAL))
    candidate_model = YOLO(str(CANDIDATE))
    rows = []
    for sample in csv.DictReader(MANIFEST.open(encoding="utf-8-sig", newline="")):
        image = cv2.imread(sample["path"])
        if image is None:
            for variant in ("original", "candidate"):
                rows.append({**sample, "variant": variant, "threshold": THRESHOLD,
                    "status": "skipped_unreadable", "raw_detection_count": 0,
                    "qualifying_detection_count": 0, "predictions_json": "[]"})
            continue
        for variant, model in (("original", original_model), ("candidate", candidate_model)):
            result = model(image, verbose=False)[0]
            predictions = []
            for box in result.boxes:
                class_id = int(box.cls[0])
                detection = {"model": "flood", "class": str(result.names[class_id]),
                    "confidence": float(box.conf[0])}
                predictions.append({"class": detection["class"],
                    "confidence": round(detection["confidence"], 6),
                    "qualifying": is_qualified_hazard_detection(detection)})
            rows.append({**sample, "variant": variant, "threshold": THRESHOLD,
                "status": "evaluated", "raw_detection_count": len(predictions),
                "qualifying_detection_count": sum(p["qualifying"] for p in predictions),
                "predictions_json": json.dumps(predictions, separators=(",", ":"))})

    fields = ["path", "group", "ground_truth", "variant", "threshold", "status",
        "raw_detection_count", "qualifying_detection_count", "predictions_json"]
    with OUTPUT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    grouped = defaultdict(list)
    for row in rows:
        grouped[(row["group"], row["variant"])].append(row)
    for key, items in sorted(grouped.items()):
        valid = [item for item in items if item["status"] == "evaluated"]
        images_with_detection = sum(int(item["qualifying_detection_count"]) > 0 for item in valid)
        print(f"{key[0]} {key[1]}: {images_with_detection}/{len(valid)} images qualifying; {len(items)-len(valid)} skipped")
    print(f"threshold={THRESHOLD:.2f}; rows={len(rows)}; CSV={OUTPUT}")


if __name__ == "__main__":
    main()
