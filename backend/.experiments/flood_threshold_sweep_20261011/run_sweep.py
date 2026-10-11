"""Re-qualify the prior saved image predictions at fixed Flood thresholds.

This intentionally performs no inference. It consumes the same audit CSV and
manifest for all thresholds, reads model-returned confidences (serialized to
six decimal places by the original evaluator), and never changes model/config.
"""
import argparse
import csv
import json
from pathlib import Path


CLASSES = {"flood": "Flood", "waterlogging": "Waterlogging"}
DEFAULT_THRESHOLDS = (0.55, 0.60, 0.65, 0.70, 0.75)


def read_rows(path):
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def image_error(ground_truth, predicted):
    hazard_truth = bool(ground_truth)
    hazard_prediction = bool(predicted)
    if hazard_truth and hazard_prediction:
        return "TP"
    if hazard_truth:
        return "FN"
    if hazard_prediction:
        return "FP"
    return "TN"


def ratio(numerator, denominator):
    return numerator / denominator if denominator else None


def confusion_summary(records, truth_key, pred_key):
    tp = fp = fn = tn = 0
    for record in records:
        truth = record[truth_key]
        predicted = record[pred_key]
        tp += int(truth and predicted)
        fp += int(not truth and predicted)
        fn += int(truth and not predicted)
        tn += int(not truth and not predicted)
    return {
        "tp_images": tp,
        "fp_images": fp,
        "fn_images": fn,
        "tn_images": tn,
        "precision": ratio(tp, tp + fp),
        "recall": ratio(tp, tp + fn),
        "false_positive_rate": ratio(fp, fp + tn),
        "false_negative_rate": ratio(fn, fn + tp),
    }


def prepare_records(source_csv, manifest):
    audit_rows = [row for row in read_rows(source_csv) if row["model"] == "flood"]
    samples = read_rows(manifest)
    by_path = {str(Path(row["path"]).resolve()).casefold(): row for row in samples}
    if len(audit_rows) != len(by_path):
        raise ValueError(f"Flood audit rows ({len(audit_rows)}) and manifest samples ({len(by_path)}) differ")
    records = []
    for row in audit_rows:
        key = str(Path(row["image_path"]).resolve()).casefold()
        if key not in by_path:
            raise ValueError(f"Audit image is absent from the fixed manifest: {row['image_path']}")
        sample = by_path[key]
        labels = {value.strip() for value in sample["labels"].split("|") if value.strip()}
        predictions = json.loads(row["predictions_json"])
        if row["label_status"] != ("known_hazard_labeled" if labels else "verified_negative"):
            raise ValueError(f"Audit label status and manifest labels disagree for {row['image_path']}")
        for prediction in predictions:
            if prediction["class"].strip().lower() not in CLASSES:
                raise ValueError(f"Unexpected Flood-model class {prediction['class']!r}")
        records.append({
            "image_path": row["image_path"],
            "source": row["source"],
            "label_status": row["label_status"],
            "ground_truth": labels,
            "raw_predictions": predictions,
            "saved_production_qualifying_count": int(row["qualifying_detection_count"]),
        })
    return sorted(records, key=lambda item: item["image_path"].casefold())


def evaluate_threshold(records, threshold):
    per_image = []
    production_flag_mismatches = 0
    for record in records:
        def prediction_qualifies(item):
            if item["class"].strip().lower() not in CLASSES:
                return False
            if threshold == 0.65:
                return bool(item.get("qualifying"))
            return float(item["confidence"]) >= threshold

        qualifying = [
            {"class": item["class"], "confidence": item["confidence"]}
            for item in record["raw_predictions"] if prediction_qualifies(item)
        ]
        accepted_classes = sorted({CLASSES[item["class"].strip().lower()] for item in qualifying})
        if threshold == 0.65 and len(qualifying) != record["saved_production_qualifying_count"]:
            production_flag_mismatches += 1
        image_result = image_error(record["ground_truth"], accepted_classes)
        per_image.append({
            "image_path": record["image_path"],
            "source": record["source"],
            "label_status": record["label_status"],
            "ground_truth_classes": "|".join(sorted(record["ground_truth"])),
            "predicted_classes": "|".join(accepted_classes),
            "image_level_result": image_result,
            "raw_predictions_json": json.dumps([
                {"class": item["class"], "confidence": item["confidence"],
                 "qualifying_at_production_0_65": bool(item.get("qualifying"))}
                for item in record["raw_predictions"]
            ], separators=(",", ":")),
            "qualifying_predictions_json": json.dumps(qualifying, separators=(",", ":")),
        })

    negative = [row for row in per_image if row["label_status"] == "verified_negative"]
    positive = [row for row in per_image if row["label_status"] == "known_hazard_labeled"]
    family_counts = {key: sum(row["image_level_result"] == key for row in per_image) for key in ("TP", "FP", "FN", "TN")}
    family = {
        "tp_images": family_counts["TP"],
        "fp_images": family_counts["FP"],
        "fn_images": family_counts["FN"],
        "tn_images": family_counts["TN"],
        "precision": ratio(family_counts["TP"], family_counts["TP"] + family_counts["FP"]),
        "recall": ratio(family_counts["TP"], family_counts["TP"] + family_counts["FN"]),
        "false_positive_rate": ratio(family_counts["FP"], family_counts["FP"] + family_counts["TN"]),
        "false_negative_rate": ratio(family_counts["FN"], family_counts["FN"] + family_counts["TP"]),
    }
    class_metrics = {}
    class_errors = {}
    for class_key, class_name in CLASSES.items():
        class_records = [
            {
                "truth": class_name in record["ground_truth_classes"].split("|"),
                "predicted": class_name in record["predicted_classes"].split("|"),
            }
            for record in per_image
        ]
        class_metrics[class_name] = confusion_summary(class_records, "truth", "predicted")
        class_errors[class_name] = {
            "false_positive_images": [
                record["image_path"] for record in per_image
                if class_name not in record["ground_truth_classes"].split("|")
                and class_name in record["predicted_classes"].split("|")
            ],
            "false_negative_images": [
                record["image_path"] for record in per_image
                if class_name in record["ground_truth_classes"].split("|")
                and class_name not in record["predicted_classes"].split("|")
            ],
        }
    fp_images = [row for row in per_image if row["image_level_result"] == "FP"]
    fn_images = [row for row in per_image if row["image_level_result"] == "FN"]
    summary = {
        "threshold": threshold,
        "images": len(per_image),
        "verified_negative_images": len(negative),
        "labeled_hazard_images": len(positive),
        "flood_family_image_metrics": family,
        "class_presence_image_metrics": class_metrics,
        "class_error_images": class_errors,
        "ordinary_and_empty_label_false_positive_images": [row["image_path"] for row in fp_images],
        "missed_labeled_hazard_images": [row["image_path"] for row in fn_images],
        "production_0_65_saved_flag_mismatch_images": production_flag_mismatches if threshold == 0.65 else None,
        "confidence_boundary_tie_count": sum(
            1 for record in records for prediction in record["raw_predictions"]
            if float(prediction["confidence"]) == threshold
        ),
        "metric_scope": "Still-image presence proxy; no box IoU matching and no temporal confirmation.",
    }
    return per_image, summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-csv", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--thresholds", type=float, nargs="+", default=DEFAULT_THRESHOLDS)
    args = parser.parse_args()
    if len(set(args.thresholds)) != len(args.thresholds) or any(not 0 <= value <= 1 for value in args.thresholds):
        parser.error("Thresholds must be unique values in [0, 1]")
    records = prepare_records(args.source_csv, args.manifest)
    if not args.output_root.is_dir():
        parser.error("--output-root must be the new experiment directory containing the manifest")
    run_dirs = [
        args.output_root / f"threshold_{threshold:.2f}".replace(".", "p")
        for threshold in args.thresholds
    ]
    existing = [path for path in run_dirs if path.exists()]
    if existing:
        parser.error(f"Run output already exists; choose a new experiment root: {existing[0]}")
    comparison = []
    for threshold, run_dir in zip(args.thresholds, run_dirs):
        run_dir.mkdir(exist_ok=False)
        per_image, summary = evaluate_threshold(records, threshold)
        with (run_dir / "per_image_predictions.csv").open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(per_image[0]))
            writer.writeheader()
            writer.writerows(per_image)
        config = {
            "threshold": threshold,
            "production_threshold": 0.65,
            "weights": "Models/flood/runs/yolo11n_flood_waterlogging-3/weights/best.pt",
            "class_mapping": {"0": "Flood", "1": "Waterlogging"},
            "data_source_csv": str(args.source_csv),
            "manifest": str(args.manifest),
            "inference_rerun": False,
            "confidence_precision": "Six decimal places from the saved evaluator CSV",
        }
        (run_dir / "config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")
        (run_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
        family = summary["flood_family_image_metrics"]
        comparison.append({
            "threshold": threshold,
            "negative_images": summary["verified_negative_images"],
            "false_positive_images": family["fp_images"],
            "false_positive_rate": family["false_positive_rate"],
            "labeled_hazard_images": summary["labeled_hazard_images"],
            "detected_hazard_images": family["tp_images"],
            "false_negative_images": family["fn_images"],
            "image_level_recall": family["recall"],
            "image_level_precision": family["precision"],
            "flood_class_recall": summary["class_presence_image_metrics"]["Flood"]["recall"],
            "waterlogging_class_recall": summary["class_presence_image_metrics"]["Waterlogging"]["recall"],
            "baseline_saved_flag_mismatches": summary["production_0_65_saved_flag_mismatch_images"],
        })
    with (args.output_root / "comparison.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(comparison[0]))
        writer.writeheader()
        writer.writerows(comparison)
    print(f"Thresholds processed: {len(comparison)}; images per threshold: {len(records)}")
    print(f"Comparison: {args.output_root / 'comparison.csv'}")


if __name__ == "__main__":
    main()
