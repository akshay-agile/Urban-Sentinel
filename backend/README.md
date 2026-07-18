# Backend — Urban Sentinel

FastAPI backend. Python **3.12.x** required.

## Windows setup (PowerShell)

```powershell
cd backend

# 1. Create virtual environment
python -m venv .venv

# 2. Activate it
.venv\Scripts\Activate.ps1

# If activation is blocked by execution policy, run once (as your user, not admin):
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# then retry the Activate.ps1 command above.

# 3. Upgrade pip
python -m pip install --upgrade pip

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create your local .env
copy .env.example .env

# 6. Run the dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Verify it's working

Open http://localhost:8000/health in a browser, or:

```powershell
curl http://localhost:8000/health
```

Expected response:

```json
{"status": "ok", "service": "urban-sentinel-backend", "env": "development"}
```

Interactive API docs: http://localhost:8000/docs

## Structure

```
backend/
├── app/
│   ├── main.py        FastAPI app instance + health check
│   ├── core/
│   │   └── config.py   Settings loaded from .env
│   ├── api/            Routers — added Session 5
│   ├── models/         SQLAlchemy models — added Session 2
│   ├── schemas/        Pydantic schemas — added Session 2
│   ├── services/       Incident/Radius/Notification/AI engines — added Session 5/9/10/11
│   └── db/             DB session/engine — added Session 2
├── requirements.txt
├── .env.example
└── .gitignore
```

## Session 2 — Database setup (Windows)

### 1. Install PostgreSQL 16.x

Download from https://www.postgresql.org/download/windows/ (the EDB
installer). During setup:
- Remember the **postgres superuser password** you set — you'll need it below.
- Default port `5432` is fine.
- You can leave Stack Builder unchecked at the end.

This also installs **pgAdmin 4**, a GUI you can use to browse tables
instead of the command line, if you prefer.

### 2. Create the database

Open **SQL Shell (psql)** from the Start menu (or use pgAdmin's Query Tool).
Log in with the postgres user and the password from step 1, then:

```sql
CREATE DATABASE urban_sentinel;
```

### 3. Point the backend at it

In `backend/.env` (copy from `.env.example` if you haven't already), set:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/urban_sentinel
```

Replace `YOUR_PASSWORD` with your actual postgres password.

### 4. Generate and apply the first migration

With the venv activated:

```powershell
cd backend
alembic revision --autogenerate -m "create initial tables"
alembic upgrade head
```

The first command inspects `app/models/` and writes a migration file into
`alembic/versions/`. The second actually creates the tables in
`urban_sentinel`.

### 5. Verify

```powershell
uvicorn app.main:app --reload
```

Open http://localhost:8000/health/db — expected:

```json
{"status": "ok", "database": "connected"}
```

If this fails, double-check `DATABASE_URL` in `.env` and that the
PostgreSQL service is running (Services app → "postgresql-x64-16").

## Structure (updated — Session 2)

```
backend/
├── app/
│   ├── main.py
│   ├── core/config.py
│   ├── models/          Users, Devices, SensorReadings, Incidents, Notifications
│   ├── crud/             Generic + per-model CRUD (get/create/update/delete)
│   ├── db/
│   │   ├── base_class.py   Declarative Base
│   │   ├── base.py         Imports all models — used by Alembic autogenerate
│   │   └── session.py      Engine, SessionLocal, get_db dependency
│   ├── schemas/           Still empty — added Session 5 (API request/response models)
│   ├── api/               Still empty — added Session 5
│   └── services/          Still empty — added Session 5/9/10/11
├── alembic/               Migrations
├── alembic.ini
├── requirements.txt
├── .env.example
└── .gitignore
```

## Session 3 — MQTT setup (Windows)

### 1. Install Mosquitto

Download from https://mosquitto.org/download/ → Windows installer
(`mosquitto-2.x.x-install-windows-x64.exe`). Run it, keep defaults.
This installs Mosquitto as a **Windows service** and adds
`C:\Program Files\mosquitto` to disk (add it to your PATH if you want
`mosquitto_pub`/`mosquitto_sub` runnable from any folder — the installer
usually offers to do this for you).

### 2. Allow local (anonymous) connections for development

Open `C:\Program Files\mosquitto\mosquitto.conf` in a text editor (as
Administrator) and make sure these two lines are present:

```
listener 1883
allow_anonymous true
```

This is fine for local development. Never do this on a broker exposed to
the internet.

### 3. Restart the Mosquitto service

`Win + R` → `services.msc` → find **Mosquitto Broker** → right-click →
Restart. (Or first-time start it if it isn't running.)

### 4. Verify the broker works, independent of our code

Open two PowerShell windows.

Window 1 (subscribe):
```powershell
mosquitto_sub -h localhost -t "urban_sentinel/sensors/#" -v
```

Window 2 (publish):
```powershell
mosquitto_pub -h localhost -t "urban_sentinel/sensors/fire_node_1" -m "{\"device_id\": \"fire_node_1\", \"timestamp\": \"2026-01-01T00:00:00Z\", \"temperature\": 30, \"humidity\": 50, \"gas\": 100, \"flame\": 0, \"rain\": 0, \"water_level\": 5, \"vibration\": 0, \"sound\": 20, \"latitude\": 12.9716, \"longitude\": 77.5946}"
```

Window 1 should immediately print the message. If it does, the broker is
working correctly — independent of Python entirely.

### 5. Run the real subscriber (writes to PostgreSQL)

With your venv activated and PostgreSQL running (Session 2):

```powershell
cd backend
python -m app.mqtt.subscriber
```

You should see:
```
Connected to MQTT broker
Subscribed to urban_sentinel/sensors/#
```

### 6. Test the full pipe with the test publisher

In a second PowerShell window (venv activated):

```powershell
cd backend
python -m scripts.test_publish --device-id fire_node_1 --count 3 --interval 1
```

Back in the subscriber window you should see `Auto-registered new device`
then `Stored reading from fire_node_1` for each message. Check it actually
landed in Postgres via pgAdmin (`devices` and `sensor_readings` tables),
or:

```powershell
psql -U postgres -d urban_sentinel -c "SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 5;"
```

## Structure (updated — Session 3)

```
backend/
├── app/
│   ├── mqtt/
│   │   ├── client.py       Shared paho-mqtt client factory
│   │   ├── topics.py       Topic naming (urban_sentinel/sensors/{device_id})
│   │   └── subscriber.py   Parses payloads, persists via CRUD — run standalone for now
│   ├── models/ crud/ db/   (Session 2)
│   ├── main.py
│   └── core/config.py
├── scripts/
│   └── test_publish.py     One-off test publisher — NOT the real simulator (that's Session 4)
├── alembic/
├── requirements.txt
└── .env.example
```

The subscriber runs as its own process (`python -m app.mqtt.subscriber`)
rather than inside the FastAPI app — wiring it into the app's lifecycle
happens in Session 8 (Backend Integration), so the API and the ingestion
pipeline stay cleanly separable until then.

## Session 5 — Backend APIs

All endpoints are under `/api/v1`. Interactive docs (Swagger UI) are the
easiest way to try them: start the server and open
http://localhost:8000/docs — every endpoint below is listed there with a
"Try it out" button, no separate tool needed.

```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

### Devices
| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/devices/` | List (paginated via `skip`/`limit`) |
| GET | `/api/v1/devices/{id}` | By primary key |
| GET | `/api/v1/devices/by-device-id/{device_id}` | By the MQTT schema's `device_id` string, e.g. `fire_node_1` |
| POST | `/api/v1/devices/` | Manually pre-register a node (409 if `device_id` already exists) |
| PATCH | `/api/v1/devices/{id}` | Partial update |
| DELETE | `/api/v1/devices/{id}` | |

### Sensor Readings — **read-only**
| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/sensor-readings/` | List (paginated) |
| GET | `/api/v1/sensor-readings/device/{device_pk}` | Recent readings for one device |
| GET | `/api/v1/sensor-readings/{id}` | Single reading |

No POST — readings only enter the system through the Session 3 MQTT
pipeline. This keeps one single source of truth for sensor data.

### Incidents
| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/incidents/` | List (paginated) |
| GET | `/api/v1/incidents/active` | Only `status=active` |
| GET | `/api/v1/incidents/{id}` | |
| POST | `/api/v1/incidents/` | Manual creation — real auto-detection arrives in Session 11's rule engine |
| PATCH | `/api/v1/incidents/{id}` | e.g. `{"status": "resolved"}` |
| DELETE | `/api/v1/incidents/{id}` | |

### Notifications
| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/notifications/` | List (paginated) |
| GET | `/api/v1/notifications/user/{user_id}` | A user's notification history |
| GET | `/api/v1/notifications/{id}` | |
| POST | `/api/v1/notifications/` | Manual creation — real auto-generation arrives in Session 9/10 |
| PATCH | `/api/v1/notifications/{id}` | e.g. `{"status": "sent"}` |
| DELETE | `/api/v1/notifications/{id}` | |

## Session 6 — Auth APIs (for the mobile app)

Added to support mobile Login/Register/Profile. Same setup as before —
just `pip install -r requirements.txt` again for the new deps (`bcrypt`,
`pyjwt`, `email-validator`).

**Important — bind to your network, not just localhost:** the mobile app
runs on your phone, a separate device, so it can't reach a server only
listening on `127.0.0.1`. Start the server with:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

See `mobile/README.md`'s "Session 6 — Connecting to your backend"
section for finding your PC's LAN IP and firewall setup.

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/auth/register` | `{full_name, email, password, phone_number?}` → 201 + access token + user |
| POST | `/api/v1/auth/login` | `{email, password}` → access token + user |
| GET | `/api/v1/auth/me` | Requires `Authorization: Bearer <token>` |
| PATCH | `/api/v1/auth/me` | Update profile / register location & push token |

Passwords are hashed with bcrypt, never stored or returned in plaintext.
Tokens are JWTs (HS256, 7-day expiry) — the `secret_key` in
`app/core/config.py` is a placeholder; fine for a college project running
locally, but would need to become a real secret before any public
deployment.

Tested end-to-end before delivery: register, duplicate-email rejection
(409), weak-password rejection (422), login with correct/incorrect
password, `/me` with missing/invalid/valid tokens, and profile update —
all via FastAPI's TestClient, all passing.

## Structure (updated — Session 6)

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py          get_db + get_current_user
│   │   └── routes/           auth.py (new), devices.py, sensor_readings.py, incidents.py, notifications.py
│   ├── core/
│   │   ├── config.py
│   │   └── security.py        Password hashing (bcrypt) + JWT (pyjwt)
│   ├── schemas/
│   │   └── user.py             UserRegister, UserLogin, UserRead, UserUpdateMe, Token
│   └── mqtt/ crud/ models/ db/   (Sessions 2–3)
├── scripts/
├── alembic/
└── requirements.txt
```
