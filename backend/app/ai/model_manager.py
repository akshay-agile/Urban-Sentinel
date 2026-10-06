from pathlib import Path
from ultralytics import YOLO


PROJECT_ROOT = Path(__file__).resolve().parents[4]
MODELS_ROOT = PROJECT_ROOT / "Models"


FIRE_MODEL_PATH = MODELS_ROOT / "fire" / "best.pt"

FLOOD_MODEL_PATH = (
    MODELS_ROOT
    / "flood"
    / "runs"
    / "yolo11n_flood_waterlogging-3"
    / "weights"
    / "best.pt"
)

ACCIDENT_MODEL_PATH = (
    MODELS_ROOT
    / "accident"
    / "runs"
    / "yolo11n_accident"
    / "weights"
    / "best.pt"
)


print("Loading Urban Sentinel AI models...")

fire_model = YOLO(str(FIRE_MODEL_PATH))
print("✓ Fire model loaded")

flood_model = YOLO(str(FLOOD_MODEL_PATH))
print("✓ Flood model loaded")

accident_model = YOLO(str(ACCIDENT_MODEL_PATH))
print("✓ Accident model loaded")

print("All Urban Sentinel AI models loaded successfully.")