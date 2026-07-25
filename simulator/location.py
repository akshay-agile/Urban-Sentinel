"""
Auto-detects an approximate real-world location for this machine via
IP-based geolocation — so simulated sensor nodes (and any test incidents
you create nearby) naturally land wherever you actually are, instead of
a hardcoded example city halfway across the world.

This is approximate (city-level, sometimes off by a few km depending on
your ISP) — good enough for demo/testing purposes where you just need
"somewhere near my phone", not survey-grade precision. Falls back to the
.env default (config.py's LATITUDE/LONGITUDE) if detection fails — no
internet, the geolocation service is down, etc. — so the simulator never
hard-fails just because this lookup didn't work.
"""
import logging

import requests

logger = logging.getLogger("simulator.location")

_IPAPI_URL = "https://ipapi.co/json/"


def detect_location() -> tuple[float, float] | None:
    """Returns (latitude, longitude) or None if detection failed."""
    try:
        response = requests.get(_IPAPI_URL, timeout=5)
        response.raise_for_status()
        data = response.json()

        lat, lon = data.get("latitude"), data.get("longitude")
        if lat is None or lon is None:
            logger.warning("Location service returned no coordinates; using configured default.")
            return None

        city = data.get("city", "unknown location")
        region = data.get("region", "")
        logger.info(f"Auto-detected location: {city}, {region} ({lat}, {lon})")
        return float(lat), float(lon)
    except Exception as exc:
        logger.warning(f"Could not auto-detect location ({exc}); using configured default.")
        return None
