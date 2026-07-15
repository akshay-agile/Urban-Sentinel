"""
Thin factory around paho-mqtt's Client, using the v2 callback API
(paho-mqtt 2.x default going forward). Shared by the subscriber here and
by any publisher (test script now, real simulator in Session 4).
"""
import paho.mqtt.client as mqtt

from app.core.config import get_settings

settings = get_settings()


def build_client(client_id: str) -> mqtt.Client:
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=client_id,
    )
    return client


def connect(client: mqtt.Client) -> None:
    client.connect(settings.mqtt_broker_host, settings.mqtt_broker_port)
