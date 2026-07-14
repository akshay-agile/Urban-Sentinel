# Urban Sentinel

AI-powered IoT Emergency Intelligence Platform.

Detects emergency events (fire, gas leak, flood, structural damage, high
temperature, loud explosion) from IoT sensor nodes, classifies and scores
severity, computes an alert radius, identifies nearby registered citizens,
and pushes notifications to the mobile app while updating the authority
dashboard in real time.

The **mobile application is the primary product** (used by citizens). The
**web dashboard is an internal admin panel** (used by authorities).

## Monorepo layout

```
urban-sentinel/
├── backend/      FastAPI backend (auth, MQTT subscriber, incident engine,
│                 radius engine, notification engine, AI engine, DB layer)
├── mobile/       React Native (Expo) citizen app — PRIMARY product
├── dashboard/    React + Vite authority admin panel
├── simulator/    Python ESP32-behavior simulator (Session 4)
├── hardware/     ESP32 firmware, wiring docs (Session 12)
└── docs/         Architecture notes, schemas, ADRs
```

## Development strategy

Hardware is not available yet. The complete software stack is built first;
the **simulator** stands in for real sensor nodes and publishes the exact
same MQTT JSON payload that the ESP32 firmware will publish later. When
hardware arrives, only the data source changes — backend and frontend
require no modification.

## Sessions

This project is built session-by-session. See `docs/SESSIONS.md` for the
full roadmap. We are currently on **Session 1 — Project Initialization**.

## Prerequisites (Windows)

| Tool | Version | Notes |
|---|---|---|
| Python | 3.12.x | https://www.python.org/downloads/ — check "Add python.exe to PATH" during install |
| Node.js | 20 LTS | https://nodejs.org/en/download — includes npm |
| PostgreSQL | 16.x | Installed in Session 2 |
| Git | latest | https://git-scm.com/download/win |
| Expo CLI | via npx, no global install needed | |

Verify installs in PowerShell:

```powershell
python --version
node --version
npm --version
git --version
```

## Getting started

See setup instructions in `backend/README.md`, `mobile/README.md`, and
`dashboard/README.md`.
