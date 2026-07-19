"""
Turns an Incident into the title/body a person actually reads — used by
both FCM push (Android) and the WebSocket event that triggers iOS's local
notification, so the two channels show identical wording.
"""
from app.models.incident import Incident

_EMOJI = {
    "fire": "🔥",
    "gas_leak": "⚠️",
    "flood": "🌊",
    "structural_damage": "🏚️",
    "temperature_spike": "🌡️",
    "explosion": "💥",
}


def build_notification_content(incident: Incident) -> tuple[str, str]:
    incident_type = incident.incident_type.value
    label = incident_type.replace("_", " ").title()
    emoji = _EMOJI.get(incident_type, "🚨")

    title = f"{emoji} {label} Alert"
    body = (
        f"A {incident.severity.value} severity {label.lower()} incident was detected "
        f"near your location (within {int(incident.radius_meters)}m). Stay alert."
    )
    return title, body
