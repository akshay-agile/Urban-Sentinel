# Session Roadmap

| # | Session | Deliverables |
|---|---|---|
| 1 | Project Initialization | Monorepo, backend/mobile/dashboard setup, env config, deps, README, git |
| 2 | Database Design | PostgreSQL, SQLAlchemy models, relationships, CRUD |
| 3 | MQTT Setup | Mosquitto, publisher, subscriber, testing |
| 4 | Sensor Simulator | Python simulator — Normal/Fire/Flood/Gas Leak/Structural Damage modes |
| 5 | Backend APIs | Device, Sensor, Incident, Notification APIs |
| 6 | Mobile Application | Login, Register, Home, Alerts, Nearby Incidents, History, Profile, Settings |
| 7 | Authority Dashboard | Live dashboard, live devices, incident table, maps, analytics |
| 8 | Backend Integration | Simulator → Backend → DB → Mobile → Dashboard |
| 9 | Radius Engine | Radius calculation, nearby-user detection, notification generation |
| 10 | Firebase Push Notifications | Firebase setup, mobile notifications, alert testing |
| 11 | AI Engine | Incident classification, severity prediction, rule engine |
| 12 | Hardware Integration | Replace simulator with ESP32, MQTT validation, end-to-end testing |

Rules:
- One session at a time. No skipping, no merging.
- No business logic before its designated session.
- Every session ends with a summary: what was built, why, how it connects
  to the next session — then stops for confirmation.
- Previous sessions are not redesigned unless explicitly requested.
