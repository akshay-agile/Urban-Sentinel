from pathlib import Path
import time
from ultralytics import YOLO

PROJECT = Path(r"D:\Akshay\major project\Project\urban-sentinel\backend\.experiments\flood_fp_candidate_20261010")
START_WEIGHTS = Path(r"D:\Akshay\major project\Project\Models\flood\runs\yolo11n_flood_waterlogging-3\weights\best.pt")
DATA_YAML = PROJECT / "data.yaml"
started = time.monotonic()
model = YOLO(str(START_WEIGHTS))
print(f"Starting from {START_WEIGHTS}; names={model.names}; task={model.task}", flush=True)
model.train(
    data=str(DATA_YAML),
    epochs=3,
    patience=3,
    imgsz=640,
    batch=4,
    device=0,
    workers=0,
    pretrained=True,
    optimizer="auto",
    lr0=0.001,
    seed=42,
    deterministic=True,
    amp=True,
    fliplr=0.5,
    flipud=0.0,
    mosaic=1.0,
    close_mosaic=1,
    cache=False,
    val=True,
    save=True,
    plots=True,
    project=str(PROJECT / "runs"),
    name="flood_fp_finetune_3ep",
    exist_ok=False,
    verbose=True,
)
print(f"Training finished in {time.monotonic() - started:.1f}s", flush=True)
print(f"Candidate weights: {PROJECT / 'runs' / 'flood_fp_finetune_3ep' / 'weights' / 'best.pt'}", flush=True)
