# Sensor JSON Schema (Frozen)

This is the MQTT payload contract published by every sensor node — the
Session 4 simulator and, later, real ESP32 hardware — with no difference
between them. The backend is written against this schema; it must never
change without a version bump and an explicit decision to do so.

```json
{
  "device_id": "fire_node_1",
  "timestamp": "ISO8601",
  "temperature": 35.2,
  "humidity": 62,
  "gas": 420,
  "flame": 0,
  "rain": 0,
  "water_level": 10,
  "vibration": 0,
  "sound": 30,
  "latitude": 12.9716,
  "longitude": 77.5946
}
```

| Field | Type | Notes |
|---|---|---|
| device_id | string | Unique per node, matches `Devices` table |
| timestamp | string | ISO 8601, UTC |
| temperature | float | °C |
| humidity | float | % |
| gas | int | Analog gas sensor reading |
| flame | int (0/1) | Flame sensor digital output |
| rain | int (0/1) | Rain sensor digital output |
| water_level | float | cm or sensor-native unit |
| vibration | int (0/1) | Vibration sensor digital output |
| sound | float | dB or sensor-native unit |
| latitude | float | Fixed per node install location |
| longitude | float | Fixed per node install location |

This document exists now, in Session 1, purely as a contract reference.
No parsing/validation logic is implemented until Session 3 (MQTT) and
Session 4 (Simulator).
