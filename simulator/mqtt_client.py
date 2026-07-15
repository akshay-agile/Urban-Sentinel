"""
Standalone MQTT publisher client — intentionally not shared with the
backend's app/mqtt/client.py (see config.py docstring for why).
"""
import paho.mqtt.client as mqtt

from config import settings


def build_and_connect(client_id: str) -> mqtt.Client:
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=client_id,
    )
    client.connect(settings.mqtt_broker_host, settings.mqtt_broker_port)
    client.loop_start()
    return client


def topic_for(device_id: str) -> str:
    return f"{settings.mqtt_topic_prefix}/{device_id}"
