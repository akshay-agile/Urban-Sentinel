from .model_manager import fire_model, flood_model, accident_model
from app.ai.visual_severity import assess_visual_severity
from app.models.enums import IncidentTypeEnum
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


def is_qualified_hazard_detection(detection):
    """Return whether a raw model box qualifies as an Urban Sentinel hazard."""
    model = detection["model"]
    detected_class = detection["class"].lower()
    confidence = detection["confidence"]
    threshold = MODEL_THRESHOLDS.get(model)

    if threshold is None or confidence < threshold:
        return False

    accepted_classes = {
        "fire": {"fire", "smoke"},
        "flood": {"flood", "waterlogging"},
        "accident": {"accident"},
    }
    return detected_class in accepted_classes.get(model, set())


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
        if not is_qualified_hazard_detection(detection):
            continue

        if model == "accident":
            candidates["accident"].append(detection)

        elif model == "flood":
            candidates["flood"].append(detection)

        elif model == "fire":
            candidates["fire"].append(detection)

    # Accident gets priority because the accident model is
    # specifically trained for accident detection and we observed
    # cross-model false positives on accident images.
    if candidates["accident"]:
        incident_type = IncidentTypeEnum.accident

    elif candidates["flood"]:
        incident_type = IncidentTypeEnum.flood

    elif candidates["fire"]:
        incident_type = IncidentTypeEnum.fire

    else:
        return None

    assessment = assess_visual_severity(incident_type, candidates[incident_type.value])

    return Classification(
        incident_type=incident_type,
        severity=assessment.severity,
        radius_meters=DEFAULT_RADIUS_METERS[incident_type],
        severity_reason=assessment.reason,
        severity_features=assessment.features,
    )
