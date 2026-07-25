"""
Urban Sentinel — Sensor Simulator

Behaves like an ESP32 sensor node: publishes a JSON message matching the
frozen schema (docs/sensor_json_schema.md) on
urban_sentinel/sensors/{device_id} every `PUBLISH_INTERVAL_SECONDS`.

Usage:
    python main.py                          # normal mode, uses LATITUDE/LONGITUDE from .env
    python main.py --mode fire               # start directly in fire mode
    python main.py --lat 12.98 --lon 77.60   # manual location override, this run only
    python main.py --auto-locate              # try IP geolocation instead (approximate, opt-in)

While running, type a mode name and press Enter to switch live, without
restarting:
    normal / fire / flood / gas_leak / structural_damage / temperature_spike
Type "quit" to stop.

Session 12 replaces this file with real ESP32 firmware publishing to the
exact same topic/schema — the backend requires no changes either way.
"""
import argparse
import json
import threading
import time
from datetime import datetime, timezone

from config import settings
from location import detect_location
from modes import Mode, generate_reading
from mqtt_client import build_and_connect, topic_for

_VALID_MODE_NAMES = {m.value for m in Mode}


class SimulatorState:
    def __init__(self, initial_mode: Mode):
        self.mode = initial_mode
        self._lock = threading.Lock()

    def set_mode(self, mode: Mode) -> None:
        with self._lock:
            self.mode = mode

    def get_mode(self) -> Mode:
        with self._lock:
            return self.mode


def _input_listener(state: SimulatorState, stop_event: threading.Event) -> None:
    """Runs in a background thread; reads mode-switch commands from stdin."""
    while not stop_event.is_set():
        try:
            line = input().strip().lower()
        except EOFError:
            break

        if line == "quit":
            stop_event.set()
            break
        if line in _VALID_MODE_NAMES:
            state.set_mode(Mode(line))
            print(f">> Switched to mode: {line}")
        elif line:
            print(f">> Unknown mode '{line}'. Valid: {', '.join(sorted(_VALID_MODE_NAMES))}, quit")


def build_payload(device_id: str, latitude: float, longitude: float, mode: Mode) -> dict:
    reading = generate_reading(mode)
    return {
        "device_id": device_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": latitude,
        "longitude": longitude,
        **reading,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Urban Sentinel sensor node simulator.")
    parser.add_argument("--device-id", default=settings.device_id)
    parser.add_argument("--mode", default=Mode.normal.value, choices=sorted(_VALID_MODE_NAMES))
    parser.add_argument("--interval", type=float, default=settings.publish_interval_seconds)
    parser.add_argument(
        "--lat", type=float, default=None, help="Override latitude for this run only"
    )
    parser.add_argument(
        "--lon", type=float, default=None, help="Override longitude for this run only"
    )
    parser.add_argument(
        "--auto-locate",
        action="store_true",
        help="Try IP-based geolocation instead of the .env default. Approximate — can be off by "
        "an entire city depending on your ISP's routing, so this is opt-in, not the default.",
    )
    args = parser.parse_args()

    if args.lat is not None and args.lon is not None:
        latitude, longitude = args.lat, args.lon
        print(f"Using manually specified location: ({latitude}, {longitude})")
    elif args.auto_locate:
        detected = detect_location()
        if detected is not None:
            latitude, longitude = detected
            print(f"Using auto-detected location: ({latitude}, {longitude}) — verify this looks right!")
        else:
            latitude, longitude = settings.latitude, settings.longitude
            print(f"Auto-detection failed; using configured default from .env: ({latitude}, {longitude})")
    else:
        latitude, longitude = settings.latitude, settings.longitude
        print(f"Using location from .env: ({latitude}, {longitude})")

    state = SimulatorState(Mode(args.mode))
    stop_event = threading.Event()

    client = build_and_connect(client_id=f"urban-sentinel-simulator-{args.device_id}")
    topic = topic_for(args.device_id)

    listener = threading.Thread(target=_input_listener, args=(state, stop_event), daemon=True)
    listener.start()

    print(f"Simulator running as '{args.device_id}' at ({latitude}, {longitude})")
    print(f"Publishing to '{topic}' every {args.interval}s, starting in '{args.mode}' mode")
    print("Type a mode name + Enter to switch live, or 'quit' to stop.\n")

    try:
        while not stop_event.is_set():
            payload = build_payload(args.device_id, latitude, longitude, state.get_mode())
            client.publish(topic, json.dumps(payload))
            print(f"[{payload['timestamp']}] mode={state.get_mode().value} -> {payload}")
            stop_event.wait(args.interval)
    except KeyboardInterrupt:
        pass
    finally:
        client.loop_stop()
        client.disconnect()
        print("\nSimulator stopped.")


if __name__ == "__main__":
    main()
