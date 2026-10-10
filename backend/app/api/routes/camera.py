import asyncio
from datetime import datetime, timezone

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import crud
from app.ai.inference import run_inference, classify_visual_detection
from app.api.deps import get_db
from app.services.incident_dispatch import dispatch_classification
from app.services.temporal_confirmation import temporal_confirmation
from app.ws.manager import manager as ws_manager


router = APIRouter(
    prefix="/camera",
    tags=["camera"],
)


@router.post("/frame")
async def receive_frame(
    device_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Process a camera frame and dispatch any detected incident."""

    device = crud.device.get_by_device_id(db, device_id=device_id)

    if device is None:
        raise HTTPException(
            status_code=404,
            detail="Camera device not found. Register it first.",
        )

    if not device.is_active:
        raise HTTPException(
            status_code=400,
            detail="Camera device is inactive.",
        )

    data = await file.read()

    if not data:
        raise HTTPException(status_code=400, detail="Empty image")

    image_array = np.frombuffer(data, dtype=np.uint8)
    frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image")

    results = run_inference(frame)

    detections = []
    visual_detections = []
    image_height, image_width = frame.shape[:2]

    for model_key, result in results.items():
        for box in result[0].boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            x1, y1, x2, y2 = (float(coordinate) for coordinate in box.xyxy[0].tolist())
            box_area_fraction = (
                max(0.0, x2 - x1) * max(0.0, y2 - y1) / (image_width * image_height)
            )

            detection = {
                "model": model_key,
                "class": result[0].names[class_id],
                "confidence": confidence,
            }
            detections.append({**detection, "confidence": round(confidence, 4)})
            visual_detections.append({**detection, "bbox_area_fraction": box_area_fraction})

    classification = classify_visual_detection(visual_detections)
    incident = None

    if classification is not None:
        confirmed_classification = await temporal_confirmation.process(device.id, classification)
    else:
        await temporal_confirmation.reset(device.id)
        confirmed_classification = None

    if confirmed_classification is not None:
        def broadcast(event: dict) -> None:
            asyncio.create_task(ws_manager.broadcast(event))

        incident = dispatch_classification(
            db=db,
            device=device,
            classification=confirmed_classification,
            broadcast=broadcast,
        )

    return {
        "received": True,
        "device_id": device.device_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": len(data),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "detections": detections,
        "classification": (
            {
                "incident_type": classification.incident_type.value,
                "severity": classification.severity.value,
                "radius_meters": classification.radius_meters,
                "severity_reason": classification.severity_reason,
                "severity_features": classification.severity_features,
            }
            if classification
            else None
        ),
        "incident": (
            {
                "id": incident.id,
                "incident_type": incident.incident_type.value,
                "severity": incident.severity.value,
                "latitude": incident.latitude,
                "longitude": incident.longitude,
                "radius_meters": incident.radius_meters,
                "status": incident.status.value,
            }
            if incident
            else None
        ),
    }
