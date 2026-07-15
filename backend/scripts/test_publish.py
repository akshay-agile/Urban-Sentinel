"""
MQTT test publisher — Session 3 testing tool only.

Publishes a single, valid message matching the frozen sensor JSON schema
so you can confirm broker connectivity and that the backend subscriber
actually writes a row to the database.

This is NOT the sensor simulator — Session 4 replaces this with a proper
multi-mode (Normal/Fire/Flood/Gas Leak/Structural Damage) publisher that
runs continuously. This script exists purely to test the pipe.

Usage:
    python -m scripts.test_publish
    python -m scripts.test_publish --device-id fire_node_2 --count 5
"""
import argparse
import json
import time
from datetime import datetime, timezone

from app.mqtt.client import build_client, connect
from app.mqtt.topics import device_topic


def build_test_payload(device_id: str) -> dict:
    return {
        "device_id": device_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "temperature": 35.2,
        "humidity": 62,
        "gas": 420,
        "flame": 0,
        "rain": 0,
        "water_level": 10,
        "vibration": 0,
        "sound": 30,
        "latitude": 12.9716,
        "longitude": 77.5946,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish test sensor messages over MQTT.")
    parser.add_argument("--device-id", default="fire_node_1")
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--interval", type=float, default=1.0, help="Seconds between messages")
    args = parser.parse_args()

    client = build_client(client_id="urban-sentinel-test-publisher")
    connect(client)
    client.loop_start()

    topic = device_topic(args.device_id)
    for i in range(args.count):
        payload = build_test_payload(args.device_id)
        client.publish(topic, json.dumps(payload))
        print(f"[{i + 1}/{args.count}] Published to {topic}: {payload}")
        if i < args.count - 1:
            time.sleep(args.interval)

    client.loop_stop()
    client.disconnect()


if __name__ == "__main__":
    main()
