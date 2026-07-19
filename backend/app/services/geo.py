"""
Great-circle distance between two lat/lon points, via the haversine
formula. Deliberately plain Python/math — no PostGIS or geo library
dependency, which would add setup cost for no real benefit at this
project's scale (a handful of incidents and users, not a mapping engine).
"""
import math

EARTH_RADIUS_METERS = 6_371_000


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_METERS * c
