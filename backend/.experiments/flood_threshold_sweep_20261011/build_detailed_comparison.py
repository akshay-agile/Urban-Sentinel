"""Build a joined class- and family-level threshold table from saved runs."""
import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "comparison_detailed.csv"
if OUTPUT.exists():
    raise SystemExit(f"Refusing to overwrite {OUTPUT}")

rows = []
for config_path in sorted(ROOT.glob("threshold_*/config.json")):
    run_dir = config_path.parent
    config = json.loads(config_path.read_text(encoding="utf-8"))
    summary = json.loads((run_dir / "summary.json").read_text(encoding="utf-8"))
    family = summary["flood_family_image_metrics"]
    row = {
        "threshold": config["threshold"],
        "negative_images": summary["verified_negative_images"],
        "family_fp": family["fp_images"],
        "family_fn": family["fn_images"],
        "family_tp": family["tp_images"],
        "family_tn": family["tn_images"],
        "family_precision": family["precision"],
        "family_recall": family["recall"],
        "family_fpr": family["false_positive_rate"],
        "family_fnr": family["false_negative_rate"],
        "labeled_hazard_images": summary["labeled_hazard_images"],
        "production_flag_mismatches": summary["production_0_65_saved_flag_mismatch_images"],
        "confidence_boundary_ties": summary["confidence_boundary_tie_count"],
    }
    for class_name in ("Flood", "Waterlogging"):
        metrics = summary["class_presence_image_metrics"][class_name]
        prefix = class_name.lower()
        for key, output_key in (
            ("tp_images", "tp"), ("fp_images", "fp"),
            ("fn_images", "fn"), ("tn_images", "tn"),
            ("precision", "precision"), ("recall", "recall"),
            ("false_positive_rate", "fpr"), ("false_negative_rate", "fnr"),
        ):
            row[f"{prefix}_{output_key}"] = metrics[key]
    rows.append(row)

with OUTPUT.open("w", newline="", encoding="utf-8") as handle:
    writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
print(f"Wrote {len(rows)} threshold rows to {OUTPUT}")
