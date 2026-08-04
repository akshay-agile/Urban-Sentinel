"""
Turns an Incident into the message a person actually reads.

Two things a raw "Fire Alert — 800m radius" message doesn't tell someone:
  1. Where the danger actually is, relative to THEM specifically (not
     just the incident's blast/alert radius, which says nothing about
     the recipient's own position).
  2. What they should actually do about it.

This module fixes both — every notification is personalized with the
recipient's own distance and compass direction to the incident, plus
concrete safety guidance for that incident type. Used by both FCM push
(Android) and the WebSocket event that triggers iOS's local
notification, so both channels show identical, useful wording.

No emoji in the title — decorative icons read as informal/gamified for
a life-safety alert (compare to how Amber Alerts or weather warnings are
worded: plain and direct). Urgency for critical incidents is conveyed
with a short "URGENT:" prefix instead, reserved for critical severity
only so it doesn't lose meaning through overuse.
"""
from app.models.enums import SeverityEnum
from app.models.incident import Incident
from app.services.geo import bearing_degrees, bearing_to_compass

# Plain, concrete instructions — not "stay safe", actual actions.
_SAFETY_GUIDANCE = {
    "fire": "Move away from the area now. Don't use elevators. Follow evacuation routes if you're in a building.",
    "gas_leak": "Don't use open flames, switches, or your car ignition nearby. Move upwind and away from the source.",
    "flood": "Move to higher ground. Don't walk or drive through moving water, even if it looks shallow.",
    "structural_damage": "Stay well clear of the structure. Don't enter or go near damaged buildings.",
    "temperature_spike": "Avoid strenuous activity outdoors. Stay hydrated and seek shade or air conditioning.",
    "explosion": "Move away from the area immediately. Follow instructions from local authorities if given.",
}


def _distance_phrase(distance_meters: float | None, direction: str | None) -> str:
    if distance_meters is None:
        return ""
    rounded = round(distance_meters)
    if rounded < 50:
        return "very close to your location"
    distance_str = f"{rounded}m" if rounded < 1000 else f"{rounded / 1000:.1f}km"
    return f"about {distance_str} {direction} of you" if direction else f"about {distance_str} away"


def build_notification_content(
    incident: Incident,
    distance_meters: float | None = None,
    user_latitude: float | None = None,
    user_longitude: float | None = None,
) -> tuple[str, str]:
    """
    If `distance_meters` (and the user's own coordinates, for direction)
    are provided, the message is personalized to that specific
    recipient. Without them, falls back to a generic message describing
    the incident's own alert radius — used only where no specific
    recipient is known (e.g. the dashboard's incident feed).
    """
    incident_type = incident.incident_type.value
    label = incident_type.replace("_", " ").title()
    guidance = _SAFETY_GUIDANCE.get(incident_type, "Stay alert and follow guidance from local authorities.")

    urgency_prefix = "URGENT: " if incident.severity == SeverityEnum.critical else ""
    title = f"{urgency_prefix}{label} Alert"

    direction = None
    if distance_meters is not None and user_latitude is not None and user_longitude is not None:
        bearing = bearing_degrees(user_latitude, user_longitude, incident.latitude, incident.longitude)
        direction = bearing_to_compass(bearing)

    location_phrase = _distance_phrase(distance_meters, direction)
    if not location_phrase:
        location_phrase = f"within {int(incident.radius_meters)}m of your registered location"

    body = f"A {incident.severity.value} severity {label.lower()} was detected {location_phrase}. {guidance}"
    return title, body
