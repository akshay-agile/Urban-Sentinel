# Simulator — Urban Sentinel

A Python application that behaves exactly like an ESP32 sensor node: it
publishes a JSON message matching the frozen schema
(`docs/sensor_json_schema.md`) to `urban_sentinel/sensors/{device_id}`
every few seconds. Session 12 replaces this with real ESP32 firmware
publishing to the same topic in the same shape — the backend requires
zero changes either way.

## Modes

| Mode | Signature values |
|---|---|
| `normal` | Baseline — everything in a calm range. Default idle state. |
| `fire` | High temperature **and** `flame=1` |
| `flood` | High `water_level`, `rain=1` |
| `gas_leak` | `gas` far above baseline |
| `structural_damage` | `vibration=1` **and** loud `sound` |
| `temperature_spike` | High temperature but `flame=0` (distinguishes from fire) |

## Windows setup (PowerShell)

```powershell
cd simulator

python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt

copy .env.example .env
```

Edit `.env` if you want — defaults are fine for a single node (`fire_node_1`
at a Bengaluru coordinate).

## Running

```powershell
python main.py
```

Starts in `normal` mode, publishing every 5 seconds (from `.env`). While
it's running, **type a mode name and press Enter** to switch live, no
restart needed:

```
fire
flood
gas_leak
structural_damage
temperature_spike
normal
quit
```

Or start directly in a specific mode with a custom interval:

```powershell
python main.py --mode fire --interval 2
```

## Simulating multiple sensor nodes at once

Open several PowerShell windows (venv activated in each), one per node:

```powershell
# Window 1
python main.py --device-id fire_node_1 --lat 12.9716 --lon 77.5946

# Window 2
python main.py --device-id flood_node_1 --lat 12.9720 --lon 77.5950 --mode flood

# Window 3
python main.py --device-id gas_node_1 --lat 12.9710 --lon 77.5940
```

Each becomes its own row in the `devices` table (auto-registered by the
Session 3 subscriber on first message) and publishes independently —
useful for a live demo showing multiple incidents/locations on the
dashboard map at once (Session 7).

## Full end-to-end demo (Session 11 onward)

With the backend, PostgreSQL, Mosquitto, and a registered mobile user
(with location + notification permission granted) all running, switch
this simulator to `fire` mode:

```
fire
```

No manual steps needed from here — the whole pipeline runs automatically:
sensor reading published → backend's Incident Engine classifies it →
incident created → Radius Engine matches nearby registered users →
Notification Engine generates alerts → real push (Android) or a live
WebSocket-triggered local notification (iOS) arrives, and the dashboard
updates within a second or two, all from one mode switch.

## Verify it's reaching the backend

With PostgreSQL, the Mosquitto broker, and the backend subscriber running
(`python -m app.mqtt.subscriber` from `backend/`), start this simulator
and switch to `fire` mode. Check `sensor_readings` in pgAdmin or via
`psql` — new rows should appear every publish interval, with `flame=1`
and elevated `temperature` while in fire mode.

## Structure

```
simulator/
├── main.py           Entrypoint — publish loop + live mode switching
├── modes.py           The six mode generators
├── config.py          Settings from .env
├── mqtt_client.py      Standalone MQTT client (not shared with backend/)
├── requirements.txt
└── .env.example
```

Deliberately has no dependency on `backend/` — it's written as if it were
an independent physical device from day one, since that's what it's
standing in for.
