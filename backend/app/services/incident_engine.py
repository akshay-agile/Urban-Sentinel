"""
Incident Engine.

Deterministic, rule-based classification: given a sensor reading, decides
whether it represents an emergency, what type, and how severe.

Deliberately rule-based rather than a black-box ML model. For a
life-safety system, explainable, auditable thresholds are the right
engineering choice — a judge (or a real operator) can point at exactly
why an alert fired. This also matches the original project brief's own
framing: rule-based logic first, with ML explicitly framed as an
optional future replacement, not a requirement.

Thresholds are written to match the exact value ranges the Session 4
simulator's six modes produce (see simulator/modes.py) — so simulated
data reliably triggers the right incident type end-to-end.
"""
from dataclasses import dataclass

from app.models.enums import IncidentTypeEnum, SeverityEnum

# Alert radius per incident type — how far the notification reach should
# extend. Kept as simple constants for now; a natural future enhancement
# would be scaling this with severity or making it configurable per zone.
_DEFAULT_RADIUS_METERS = {
    IncidentTypeEnum.fire: 800.0,
    IncidentTypeEnum.gas_leak: 500.0,
    IncidentTypeEnum.flood: 1500.0,
    IncidentTypeEnum.structural_damage: 300.0,
    IncidentTypeEnum.temperature_spike: 400.0,
    IncidentTypeEnum.explosion: 1000.0,
}


@dataclass
class Classification:
    incident_type: IncidentTypeEnum
    severity: SeverityEnum
    radius_meters: float


def _severity_from_scale(value: float, medium: float, high: float, critical: float) -> SeverityEnum:
    if value >= critical:
        return SeverityEnum.critical
    if value >= high:
        return SeverityEnum.high
    if value >= medium:
        return SeverityEnum.medium
    return SeverityEnum.low


def classify_reading(reading: dict) -> Classification | None:
    """
    `reading` is the parsed MQTT payload dict (same shape as the frozen
    sensor JSON schema). Returns None if nothing abnormal is detected.

    Rules are checked in a fixed priority order, most-specific first, so
    a reading that could match more than one rule resolves to a single,
    sensible classification rather than an arbitrary one:

      1. Fire              — temperature high AND flame=1
      2. Gas Leak          — gas far above baseline
      3. Flood             — water_level far above baseline
      4. Explosion         — extremely loud sound alone (no vibration needed)
      5. Structural Damage — vibration=1 AND loud (but not explosion-level) sound
      6. Temperature Spike — temperature high WITHOUT flame (explicitly
                              excludes what rule 1 already caught)
    """
    temperature = reading.get("temperature")
    flame = reading.get("flame")
    gas = reading.get("gas")
    water_level = reading.get("water_level")
    vibration = reading.get("vibration")
    sound = reading.get("sound")

    if flame == 1 and temperature is not None and temperature >= 50:
        severity = _severity_from_scale(temperature, medium=50, high=65, critical=80)
        return Classification(IncidentTypeEnum.fire, severity, _DEFAULT_RADIUS_METERS[IncidentTypeEnum.fire])

    if gas is not None and gas >= 500:
        severity = _severity_from_scale(gas, medium=500, high=700, critical=900)
        return Classification(IncidentTypeEnum.gas_leak, severity, _DEFAULT_RADIUS_METERS[IncidentTypeEnum.gas_leak])

    if water_level is not None and water_level >= 50:
        severity = _severity_from_scale(water_level, medium=50, high=90, critical=130)
        return Classification(IncidentTypeEnum.flood, severity, _DEFAULT_RADIUS_METERS[IncidentTypeEnum.flood])

    # Explosion: sound alone, at an extreme level — loud enough that it
    # doesn't need corroborating vibration to be worth an alert. Checked
    # before structural_damage so genuinely extreme readings don't get
    # under-classified.
    if sound is not None and sound >= 95:
        severity = SeverityEnum.critical if sound >= 98 else SeverityEnum.high
        return Classification(IncidentTypeEnum.explosion, severity, _DEFAULT_RADIUS_METERS[IncidentTypeEnum.explosion])

    if vibration == 1 and sound is not None and sound >= 65:
        severity = _severity_from_scale(sound, medium=65, high=80, critical=95)
        return Classification(
            IncidentTypeEnum.structural_damage, severity, _DEFAULT_RADIUS_METERS[IncidentTypeEnum.structural_damage]
        )

    if temperature is not None and temperature >= 45 and flame != 1:
        severity = _severity_from_scale(temperature, medium=45, high=55, critical=65)
        return Classification(
            IncidentTypeEnum.temperature_spike,
            severity,
            _DEFAULT_RADIUS_METERS[IncidentTypeEnum.temperature_spike],
        )

    return None
