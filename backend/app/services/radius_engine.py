"""
Radius Engine.

Given an incident, determines which registered citizens fall inside its
alert radius. Pulls candidates from crud.user.get_active_citizens_with_location
(Session 2) — active users with a known location and push token — then
filters by actual great-circle distance.
"""
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app import crud
from app.models.incident import Incident
from app.models.user import User
from app.services.geo import haversine_distance_meters


@dataclass
class NearbyUser:
    user: User
    distance_meters: float


def find_users_in_radius(db: Session, incident: Incident) -> list[NearbyUser]:
    """Returns matches sorted nearest-first."""
    candidates = crud.user.get_active_citizens_with_location(db)

    matches: list[NearbyUser] = []
    for user in candidates:
        distance = haversine_distance_meters(
            incident.latitude, incident.longitude, user.latitude, user.longitude
        )
        if distance <= incident.radius_meters:
            matches.append(NearbyUser(user=user, distance_meters=distance))

    matches.sort(key=lambda m: m.distance_meters)
    return matches
