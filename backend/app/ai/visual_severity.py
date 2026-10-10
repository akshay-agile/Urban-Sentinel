"""Explainable first-pass severity estimates from detected visual regions.

These are visual-extent heuristics, not ground-truth emergency severity.
TODO: calibrate each hazard's rules against a labeled severity dataset.
"""
from dataclasses import dataclass

from app.models.enums import IncidentTypeEnum, SeverityEnum


# Accident cutoffs are anchored to the available accident test annotations:
# median maximum box area ~= 7.3%; 90th percentile ~= 62.0%.
_ACCIDENT_MEDIUM_COVERAGE = 0.07
_ACCIDENT_HIGH_COVERAGE = 0.60

# Flood cutoffs use available flood train annotations: 25th percentile of
# maximum box area ~= 15.4%; 90th percentile ~= 55.8%. They describe visible
# extent only; these labels do not encode actual flood severity.
_FLOOD_MEDIUM_COVERAGE = 0.15
_FLOOD_HIGH_COVERAGE = 0.55

# Fire has no local labeled image/severity set. Rules use only the model's
# existing fire/smoke class distinction and number of accepted fire regions.


@dataclass(frozen=True)
class VisualSeverityAssessment:
    severity: SeverityEnum
    reason: str
    features: dict[str, int | float | dict[str, int]]


def assess_visual_severity(
    incident_type: IncidentTypeEnum,
    detections: list[dict],
) -> VisualSeverityAssessment:
    """Estimate severity from accepted hazard detections, never confidence."""
    coverages = [
        min(1.0, max(0.0, float(detection["bbox_area_fraction"])))
        for detection in detections
        if detection.get("bbox_area_fraction") is not None
    ]
    max_coverage = max(coverages, default=0.0)
    class_counts: dict[str, int] = {}
    for detection in detections:
        class_name = str(detection.get("class", "unknown")).lower()
        class_counts[class_name] = class_counts.get(class_name, 0) + 1

    count = len(detections)
    features: dict[str, int | float | dict[str, int]] = {
        "detected_region_count": count,
        "largest_region_coverage": round(max_coverage, 4),
        "class_counts": class_counts,
    }

    if incident_type == IncidentTypeEnum.accident:
        if max_coverage >= _ACCIDENT_HIGH_COVERAGE or count >= 3:
            severity = SeverityEnum.high
            reason = (
                f"{count} accident regions detected"
                if count >= 3
                else f"largest accident region covers {max_coverage:.1%} of the image"
            )
        elif max_coverage >= _ACCIDENT_MEDIUM_COVERAGE or count >= 2:
            severity = SeverityEnum.medium
            reason = (
                f"largest accident region covers {max_coverage:.1%} of the image"
                if max_coverage >= _ACCIDENT_MEDIUM_COVERAGE
                else f"{count} accident regions detected"
            )
        else:
            severity = SeverityEnum.low
            reason = f"single small accident region covers {max_coverage:.1%} of the image"

    elif incident_type == IncidentTypeEnum.flood:
        if max_coverage >= _FLOOD_HIGH_COVERAGE:
            severity = SeverityEnum.high
            reason = f"largest flood/waterlogging region covers {max_coverage:.1%} of the image"
        elif max_coverage >= _FLOOD_MEDIUM_COVERAGE:
            severity = SeverityEnum.medium
            reason = f"largest flood/waterlogging region covers {max_coverage:.1%} of the image"
        else:
            severity = SeverityEnum.low
            reason = f"largest flood/waterlogging region covers {max_coverage:.1%} of the image"

    elif incident_type == IncidentTypeEnum.fire:
        fire_count = class_counts.get("fire", 0)
        smoke_count = class_counts.get("smoke", 0)
        if fire_count >= 2:
            severity = SeverityEnum.high
            reason = f"{fire_count} distinct fire regions detected"
        elif fire_count == 1:
            severity = SeverityEnum.medium
            reason = "a fire region was detected"
        else:
            severity = SeverityEnum.low
            reason = (
                f"smoke detected without a fire-class region ({smoke_count} smoke regions)"
                if smoke_count
                else "no fire-class region was detected"
            )

    else:
        # This assessor is currently used by the visual camera classifier
        # only; keep unknown future hazard types conservative and explainable.
        severity = SeverityEnum.low
        reason = "no calibrated visual severity rule exists for this hazard"

    return VisualSeverityAssessment(severity, reason, features)
