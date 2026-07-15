"""
Simulator configuration. Deliberately standalone — this package does not
import anything from backend/. When hardware/ replaces this in Session 12,
that firmware obviously can't share Python code either, so the simulator
is written from day one as if it *were* an independent device, publishing
over the network like any other MQTT client.
"""
import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    mqtt_broker_host: str = os.getenv("MQTT_BROKER_HOST", "localhost")
    mqtt_broker_port: int = int(os.getenv("MQTT_BROKER_PORT", "1883"))
    # Must match backend's app.core.config.mqtt_topic_prefix default.
    mqtt_topic_prefix: str = os.getenv("MQTT_TOPIC_PREFIX", "urban_sentinel/sensors")

    device_id: str = os.getenv("DEVICE_ID", "fire_node_1")
    latitude: float = float(os.getenv("LATITUDE", "12.9716"))
    longitude: float = float(os.getenv("LONGITUDE", "77.5946"))
    publish_interval_seconds: float = float(os.getenv("PUBLISH_INTERVAL_SECONDS", "5"))


settings = Settings()
