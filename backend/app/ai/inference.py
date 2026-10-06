from .model_manager import fire_model, flood_model, accident_model
from app.models.enums import IncidentTypeEnum, SeverityEnum
from app.services.incident_engine import Classification


DEFAULT_RADIUS_METERS = {
    IncidentTypeEnum.fire: 800.0,
    IncidentTypeEnum.flood: 1500.0,
    IncidentTypeEnum.accident: 800.0,
}


# Model-specific thresholds.
# These are deliberately independent because confidence scores
# from different models should not be compared directly.
MODEL_THRESHOLDS = {
    "fire": 0.70,
    "flood": 0.65,
    "accident": 0.50,
}


def run_inference(frame):
    """
    Run all three Urban Sentinel models on one image/frame.
    """

    return {
        "fire": fire_model(frame, verbose=False),
        "flood": flood_model(frame, verbose=False),
        "accident": accident_model(frame, verbose=False),
    }


def classify_visual_detection(detections):
    """
    Convert AI detections into an Urban Sentinel incident classification.

    Each model uses its own confidence threshold.
    Model outputs are not directly compared because confidence
    values from independently trained models are not equivalent.
    """

    candidates = {
        "accident": [],
        "flood": [],
        "fire": [],
    }

    for detection in detections:

        model = detection["model"]
        detected_class = detection["class"].lower()
        confidence = detection["confidence"]

        threshold = MODEL_THRESHOLDS.get(model)

        if threshold is None or confidence < threshold:
            continue

        if model == "accident" and detected_class == "accident":
            candidates["accident"].append(confidence)

        elif model == "flood" and detected_class in {"flood", "waterlogging"}:
            candidates["flood"].append(confidence)

        elif model == "fire" and detected_class in {"fire", "smoke"}:
            candidates["fire"].append(confidence)

    # Accident gets priority because the accident model is
    # specifically trained for accident detection and we observed
    # cross-model false positives on accident images.
    if candidates["accident"]:
        confidence = max(candidates["accident"])
        incident_type = IncidentTypeEnum.accident

    elif candidates["flood"]:
        confidence = max(candidates["flood"])
        incident_type = IncidentTypeEnum.flood

    elif candidates["fire"]:
        confidence = max(candidates["fire"])
        incident_type = IncidentTypeEnum.fire

    else:
        return None

    # Explainable severity mapping.
    if confidence >= 0.80:
        severity = SeverityEnum.high
    elif confidence >= 0.65:
        severity = SeverityEnum.medium
    else:
        severity = SeverityEnum.low

    return Classification(
        incident_type=incident_type,
        severity=severity,
        radius_meters=DEFAULT_RADIUS_METERS[incident_type],
    )