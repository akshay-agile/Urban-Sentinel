"""
Single source of truth for topic naming, so the subscriber, the test
publisher, and later the real simulator (Session 4) never drift apart.

Convention: urban_sentinel/sensors/{device_id}
e.g.        urban_sentinel/sensors/fire_node_1
"""
from app.core.config import get_settings

settings = get_settings()


def device_topic(device_id: str) -> str:
    """Topic a specific sensor node publishes to."""
    return f"{settings.mqtt_topic_prefix}/{device_id}"


def wildcard_topic() -> str:
    """Topic pattern the backend subscribes to, to catch every node."""
    return f"{settings.mqtt_topic_prefix}/#"
