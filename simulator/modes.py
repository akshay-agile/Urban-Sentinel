"""
Mode definitions. Each mode returns realistic-looking, jittered sensor
values for that scenario. Ranges are chosen deliberately so the future
Incident Engine's rule thresholds (Session 5) have clean signal to key off:

  Fire               -> high temperature AND flame=1
  Gas Leak           -> gas far above normal baseline
  Flood              -> high water_level, rain=1
  Structural Damage  -> vibration=1 AND loud sound
  Temperature Spike  -> high temperature but flame=0 (distinguishes from Fire)
  Normal             -> everything inside baseline band, used as the default
                        idle state and to prove the system stays quiet
                        when nothing is wrong.
"""
import enum
import random


class Mode(str, enum.Enum):
    normal = "normal"
    fire = "fire"
    flood = "flood"
    gas_leak = "gas_leak"
    structural_damage = "structural_damage"
    temperature_spike = "temperature_spike"


def _normal() -> dict:
    return {
        "temperature": round(random.uniform(22, 30), 1),
        "humidity": round(random.uniform(40, 60), 1),
        "gas": random.randint(100, 250),
        "flame": 0,
        "rain": 0,
        "water_level": round(random.uniform(0, 15), 1),
        "vibration": 0,
        "sound": round(random.uniform(20, 40), 1),
    }


def _fire() -> dict:
    return {
        "temperature": round(random.uniform(55, 90), 1),
        "humidity": round(random.uniform(15, 30), 1),
        "gas": random.randint(300, 600),
        "flame": 1,
        "rain": 0,
        "water_level": round(random.uniform(0, 5), 1),
        "vibration": 0,
        "sound": round(random.uniform(40, 70), 1),
    }


def _flood() -> dict:
    return {
        "temperature": round(random.uniform(20, 28), 1),
        "humidity": round(random.uniform(70, 95), 1),
        "gas": random.randint(100, 200),
        "flame": 0,
        "rain": 1,
        "water_level": round(random.uniform(60, 150), 1),
        "vibration": 0,
        "sound": round(random.uniform(20, 40), 1),
    }


def _gas_leak() -> dict:
    return {
        "temperature": round(random.uniform(25, 35), 1),
        "humidity": round(random.uniform(40, 60), 1),
        "gas": random.randint(600, 1000),
        "flame": 0,
        "rain": 0,
        "water_level": round(random.uniform(0, 10), 1),
        "vibration": 0,
        "sound": round(random.uniform(20, 35), 1),
    }


def _structural_damage() -> dict:
    return {
        "temperature": round(random.uniform(20, 30), 1),
        "humidity": round(random.uniform(40, 60), 1),
        "gas": random.randint(100, 250),
        "flame": 0,
        "rain": 0,
        "water_level": round(random.uniform(0, 10), 1),
        "vibration": 1,
        "sound": round(random.uniform(70, 100), 1),
    }


def _temperature_spike() -> dict:
    return {
        "temperature": round(random.uniform(45, 65), 1),
        "humidity": round(random.uniform(20, 40), 1),
        "gas": random.randint(150, 300),
        "flame": 0,
        "rain": 0,
        "water_level": round(random.uniform(0, 10), 1),
        "vibration": 0,
        "sound": round(random.uniform(30, 50), 1),
    }


_GENERATORS = {
    Mode.normal: _normal,
    Mode.fire: _fire,
    Mode.flood: _flood,
    Mode.gas_leak: _gas_leak,
    Mode.structural_damage: _structural_damage,
    Mode.temperature_spike: _temperature_spike,
}


def generate_reading(mode: Mode) -> dict:
    return _GENERATORS[mode]()
