from pathlib import Path
import cv2

from app.ai.inference import run_inference


MODEL_DIR = Path(r"D:\Akshay\major project\Project\Models")

DATASETS = {
    "fire": MODEL_DIR / "fire",
    "flood": MODEL_DIR / "flood" / "dataset" / "final" / "test" / "images",
    "accident": MODEL_DIR / "accident" / "dataset" / "raw" / "Accident detection model.v2i.yolov11" / "test" / "images",
}


def get_images(path, limit=5):
    if not path.exists():
        return []

    return sorted(
        [
            p for p in path.rglob("*")
            if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp"}
        ]
    )[:limit]


def get_best_confidence(result):
    best = None

    for box in result[0].boxes:
        confidence = float(box.conf[0])
        class_id = int(box.cls[0])
        class_name = result[0].names[class_id]

        if best is None or confidence > best["confidence"]:
            best = {
                "class": class_name,
                "confidence": confidence,
            }

    return best


for expected, dataset_path in DATASETS.items():

    print()
    print("=" * 70)
    print(f"EXPECTED: {expected.upper()}")
    print(f"DATASET : {dataset_path}")
    print("=" * 70)

    images = get_images(dataset_path)

    if not images:
        print("No images found.")
        continue

    for image_path in images:

        frame = cv2.imread(str(image_path))

        if frame is None:
            continue

        results = run_inference(frame)

        print()
        print(f"IMAGE: {image_path.name}")

        for model_name, result in results.items():
            best = get_best_confidence(result)

            if best:
                print(
                    f"  {model_name:8} -> "
                    f"{best['class']:15} "
                    f"{best['confidence']:.4f}"
                )
            else:
                print(f"  {model_name:8} -> no detection")