# Urban Sentinel

Urban Sentinel is a city-safety platform that combines camera-based hazard detection, an authority dashboard, and a citizen-facing mobile app. The backend stores devices, sensor readings, incidents, users, and notifications; it serves the dashboard and mobile clients over a versioned REST API and WebSocket.

The camera pipeline can classify fire/smoke, flooding/waterlogging, and road accidents. MQTT sensor messages also use a separate rule-based incident path. The mobile app presents public safety information and incident progress; authority workflows remain in the web dashboard and backend.

## Project layout

```text
backend/                 FastAPI API, database, MQTT, inference, camera and notification services
dashboard/               React and Vite authority dashboard
mobile/                  Expo React Native citizen app
simulator/               MQTT sensor simulator
hardware/                ESP32 firmware and hardware notes
docs/                    Project documentation
backend/tools/mediamtx/  MediaMTX executable and RTSP configuration
```

The YOLO model weights are kept outside this repository under the sibling `Models/` directory. Model binaries, credentials, and local environment files must not be committed.

## Main capabilities and current limits

- **Backend:** JWT authentication, device registration, sensor readings, incident persistence and status updates, nearby-user notification targeting, REST endpoints, WebSocket events, MQTT ingestion, and camera-frame ingestion.
- **Camera inference:** `/api/v1/camera/frame` runs the configured fire, flood, and accident models. A visual classification must be confirmed across three consecutive qualifying frames per device before the camera route dispatches it as an incident. The in-memory confirmation state resets when the backend restarts and is not shared between multiple backend workers.
- **Dashboard:** light command-centre overview with live API-backed incident/device information, map, filters, activity, analytics, and incident status controls. Camera Network manages registered device metadata and shows available incident history; the API does not establish camera type, connectivity, or active frame submission. Notifications shows authenticated-account notification records. Responders uses a small persisted responder registry with availability and incident assignment; it does not dispatch or receive acknowledgements.
- **Mobile:** authenticated citizen experience with Home, Map, Report, Help, and Profile tabs; incident details and history; safety guidance; permission settings; and available response progress. Citizen report submission and volunteer opportunities are not backed by current server workflows and are identified as unavailable in the app. Emergency contact actions open the phone dialler; they do not themselves place or confirm a call.
- **Notifications:** Android push delivery requires a registered Android FCM token and valid Firebase Admin service-account configuration on the backend. Provider acceptance does not prove handset receipt. iOS currently uses foreground app delivery; background APNs delivery is not configured. Recipient selection uses account/device location and incident radius; notification rows are deduplicated per recipient and incident.

Do not describe an incident as verified, an authority as notified, a response as dispatched, or a push as delivered unless the corresponding backend record or provider/device result supports that statement.

## Architecture

```text
Phone camera --RTSP--> MediaMTX --RTSP--> camera client or visualizer
                                            |
                                            | multipart JPEG frames
                                            v
                                       FastAPI camera route
                                            |
                               YOLO inference and 3-frame confirmation
                                            |
                              incident persistence and dispatch
                               /                         \
                    REST + WebSocket             notification service
                       /       \                 /             \
                  Dashboard   Mobile         FCM (Android)   foreground iOS

MQTT sensors/simulator --> backend MQTT subscriber --> readings and rule-based incidents
```

The camera API is the incident-creation path for camera inference. `realtime_camera_client.py` samples RTSP frames and submits them to the backend, which performs inference. `live_camera_visualizer.py` also performs local inference for its display and submits sampled frames to the same API; running both camera consumers against one stream adds stream and inference load and is normally unnecessary. Use one consumer for a given test. A notification may be created or retried for an existing incident; it is not proof that a new incident was created.

## Technology

- **Backend:** Python, FastAPI, SQLAlchemy, Alembic, PostgreSQL, Paho MQTT, Firebase Admin, OpenCV, NumPy, and Ultralytics YOLO. The backend requirements file covers the API/database dependencies; inference libraries and compatible model weights must also be available for camera inference.
- **Dashboard:** React 18, Vite, React Router, Leaflet, Chart.js, and Lucide icons.
- **Mobile:** Expo SDK 57, React Native, React Navigation, Expo Location, Expo Notifications, SecureStore, and WebView.
- **Camera transport:** RTSP, MediaMTX, and FFmpeg/FFprobe for the Python RTSP clients.

Use the versions in the existing lockfiles and project manifests. Do not upgrade Expo or regenerate native projects as part of routine setup.

## Prerequisites

For the full local stack, install/configure:

- Python version compatible with `backend/requirements.txt` (Python 3.11 or newer is recommended).
- Node.js and npm compatible with the dashboard and Expo manifests.
- PostgreSQL and a database for the project.
- Git.
- For MQTT ingestion, an MQTT broker such as Mosquitto.
- For RTSP ingestion, FFmpeg on `PATH`; FFprobe is optional but helps the client determine stream dimensions. MediaMTX is provided under `backend/tools/mediamtx/`.
- For camera inference, compatible PyTorch/Ultralytics/OpenCV/NumPy dependencies and the three model files listed below.
- For Android push, a Firebase project, the matching private Android `google-services.json`, and a Firebase Admin service account configured privately on the backend.
- For native mobile development, Android Studio/SDK and a compatible Android device or emulator. Expo Go is not a substitute for the project's development build when native Firebase/notification configuration is needed.

## Backend setup

The commands below use PowerShell from the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` locally. Set `DATABASE_URL` to your PostgreSQL connection, set a private random `SECRET_KEY`, and configure `MQTT_BROKER_HOST` if using MQTT. For Firebase push, set `FIREBASE_CREDENTIALS_PATH` to a private service-account JSON file outside version control. Never paste real credentials into this README or commit them.

Create the PostgreSQL database, then run migrations and start the API:

```powershell
alembic upgrade head
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Run these commands from `backend/` with its virtual environment active. The API base URL is `http://localhost:8000/api/v1`; interactive API documentation is available at `http://localhost:8000/docs`. Health endpoints include `/health`, `/health/db`, `/health/mqtt`, and `/health/firebase`. PostgreSQL is required for normal API operation. MQTT availability is needed only for the MQTT sensor path; its absence does not by itself prevent the REST API from starting.

### AI model files

The current inference code expects these files outside the Git repository:

```text
../Models/fire/best.pt
../Models/flood/runs/yolo11n_flood_waterlogging-3/weights/best.pt
../Models/accident/runs/yolo11n_accident/weights/best.pt
```

Install model-runtime packages in the backend environment using versions compatible with the available PyTorch/CUDA or CPU setup. The project does not vendor these large weights, and `pip install -r requirements.txt` alone does not provide them. Without the runtime dependencies and files, camera inference cannot operate.

## Dashboard setup

```powershell
cd dashboard
npm ci
Copy-Item .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` in `dashboard/.env` to the backend API base URL, normally `http://localhost:8000/api/v1`. For a production bundle, run `npm run build`; `npm run preview` serves the generated bundle locally. Vite reads `VITE_*` values at build time.

The dashboard exposes `/` (overview), `/devices`, `/cameras`, `/incidents`, `/analytics`, `/notifications`, and `/responders`. The overview map, incident filters, API-backed queue, and status controls use application data. Management and recipient-specific notification routes use the existing `/auth/login` JWT flow. Do not interpret an empty result as proof that the city is safe or that a camera feed is live.

## Mobile setup

Install the locked dependencies and configure the API base URL in `mobile/src/config.js`:

```powershell
cd mobile
npm ci
npx expo start --dev-client
```

On a physical phone, set the base URL to an address reachable from that phone (the development computer's current LAN address), not `localhost`. Keep the URL and any credentials out of committed changes. The app uses authenticated API requests and stores its session securely.

The first authenticated launch explains and requests foreground location and notification permissions. Location consent is optional and no background location permission is requested. Users can revisit permission settings later. Push-token registration requires notification permission and the configured native Firebase/Expo setup. Icon and native permission/configuration changes require a rebuilt Android development binary; a JavaScript reload does not update the installed native app. Build/run Android locally with `npx expo run:android` when the development environment is configured.

## RTSP camera ingestion

The provided MediaMTX config listens on RTSP port `8554` and declares the `urban-sentinel` and `urban-sentinel-direct` paths. MediaMTX is the relay/server; it does not discover or publish the phone camera automatically. The phone camera app must be actively publishing, and the configured source URL must be the phone's current RTSP URL. If relaying the phone source into MediaMTX, publish it to the configured local path, for example `rtsp://127.0.0.1:8554/urban-sentinel-direct`. Keep any source URL credentials private.

From the repository root, start MediaMTX in its own terminal:

```powershell
.\backend\tools\mediamtx\mediamtx.exe .\backend\tools\mediamtx\mediamtx.yml
```

Register an active camera device with a stable `device_id` and the device's actual configured latitude/longitude using `POST /api/v1/devices/` (or confirm it through `GET /api/v1/devices/by-device-id/{device_id}`). The camera-frame endpoint rejects unknown or inactive devices. Do not reuse a device ID unless it identifies the intended registered camera.

The Python ingestion client reads FFmpeg from `PATH`. From `backend/`, with backend dependencies installed, run a bounded sample test after the RTSP publisher is confirmed:

```powershell
python -m scripts.realtime_camera_client --rtsp-url "<CURRENT_RELAY_RTSP_URL>" --backend-url "http://localhost:8000/api/v1" --device-id "<REGISTERED_ACTIVE_DEVICE_ID>" --fps 2 --duration 20
```

The client also accepts `URBAN_SENTINEL_RTSP_URL`, `URBAN_SENTINEL_BACKEND_URL`, `URBAN_SENTINEL_DEVICE_ID`, and `URBAN_SENTINEL_SAMPLE_FPS`. Its defaults target the local `urban-sentinel-direct` MediaMTX path and `camera_1`; defaults do not prove that either the publisher or device is currently available. The visualizer accepts `--rtsp-url`; its backend submission settings are configured through the client environment variables. Choose either the client or visualizer as the consumer for a bounded check to avoid duplicate inference.

The frame endpoint expects multipart form fields `device_id` and JPEG `file`. A successful frame response includes `received: true`; `incident` can legitimately be `null` for the first two consecutive qualifying frames. After the third qualifying frame, the response may include an incident object. Check HTTP status and response body, backend logs, and `GET /api/v1/incidents/active` to confirm persistence. A detection drawn in the visualizer alone proves only local inference, not backend submission or incident creation.

## API overview

API routes are mounted under `/api/v1`. The exact request and response schemas are in the FastAPI OpenAPI document at `/docs`.

| Area | Representative routes | Purpose |
|---|---|---|
| Authentication | `POST /auth/register`, `POST /auth/login`, `GET/PATCH /auth/me` | Account and authenticated profile/token updates |
| Devices | `GET/POST /devices/`, `GET /devices/by-device-id/{device_id}`, `PATCH/DELETE /devices/{id}` | Camera/sensor registration and administration; dashboard metadata create/edit requires an authority JWT |
| Sensor readings | `GET /sensor-readings/`, `GET /sensor-readings/device/{device_pk}` | Persisted sensor data |
| Incidents | `GET /incidents/active`, `GET /incidents/`, `GET /incidents/{id}`, `POST /incidents/`, `PATCH/DELETE /incidents/{id}` | Incident listing, details, creation, and status management |
| Camera | `POST /camera/frame` | Multipart image submission, inference, temporal confirmation, and camera incident dispatch |
| Notifications | `GET /notifications/mine`, `/notifications/` routes | Authenticated user's persisted notification history and existing delivery records |
| Responders | `GET/POST /responders/`, `PATCH /responders/{id}` | Authority-only persisted profiles, availability and incident assignments |

Apply `alembic upgrade head` after updating to create the `responders` table. New responder records start unavailable. Assignment and availability edits are persisted, but no dispatch, acknowledgement, or location tracking capability exists.

Authentication is required on protected user-specific routes. Check `/docs` for route-level authorization and payload details rather than assuming every route is public.

## Notifications and permissions

Notification generation and push delivery are separate stages. The backend first determines eligible registered users based on the incident radius and their stored location, then persists a deduplicated notification and attempts the configured delivery channel. No eligible nearby recipient, a missing device token, missing Firebase credentials, provider rejection, or device OS settings can prevent a notification from reaching a handset. Review backend notification and Firebase health logs as well as the app's registered token state. A database row or successful provider enqueue is not proof of visible delivery.

The mobile app requests foreground permissions after authentication with an explanation and provides a settings entry for later changes. Permission denial is respected; the app does not request background location. Android native Firebase configuration is private and must match the backend Firebase project. Never commit service-account keys or production tokens.

## MQTT and simulator

The backend starts its MQTT subscriber as part of application lifespan and retries broker connection. Configure a broker and topic prefix (`MQTT_BROKER_HOST`, `MQTT_BROKER_PORT`, `MQTT_TOPIC_PREFIX`) in the backend environment. The simulator under `simulator/` publishes sensor-style MQTT messages; inspect its README/CLI for its current command and payload options. MQTT rule-based detection is a separate path from the camera's YOLO classification and three-frame confirmation.

## Tests and checks

From the relevant project directory:

```powershell
# Backend unit/integration tests
cd backend
python -m unittest discover -s tests

# Dashboard production build
cd ..\dashboard
npm run build

# Mobile Expo configuration and JavaScript bundle checks
cd ..\mobile
npx expo config --type public
npx expo export --platform android
```

Camera/model integration tests may require the external model weights, model-runtime dependencies, PostgreSQL, or other configured services. A successful JavaScript export does not verify Android permission dialogs, FCM delivery, device location, or native icon appearance on a physical device. For a quick syntax-only check, use the existing Babel installation: `npx babel src --extensions ".js,.jsx" --out-dir <temporary-output-directory>`; remove only that temporary output after inspection.

## Troubleshooting

- **API cannot connect to PostgreSQL:** check `DATABASE_URL`, that PostgreSQL is running, that the database exists, and that `alembic upgrade head` completed.
- **Mobile cannot reach the API:** use the computer's current LAN address in `mobile/src/config.js`, allow the development port through the local firewall, and ensure phone and computer can reach each other.
- **No MQTT readings:** check the broker host/port and `/health/mqtt`; MQTT is independent of RTSP camera ingestion.
- **No camera frames:** confirm MediaMTX is listening, the phone publisher is active at its current URL, the local relay path matches the configured path, FFmpeg is on `PATH`, and the client response is HTTP-successful.
- **Frames arrive but no incident appears:** confirm an active registered `device_id`, valid model paths/dependencies, qualifying detections, and three consecutive qualifying classifications. Confirmation is in-memory and resets on backend restart.
- **Incident exists but no phone alert appears:** inspect nearby-user eligibility, persisted notification record, Android token/Firebase configuration/provider result, and mobile OS notification settings. A notification is not guaranteed when there is no eligible recipient or valid delivery token.
- **Blank/empty map:** incident coordinates must exist and be returned by the backend; no marker or route is fabricated when the application has no location data.

## Configuration and repository hygiene

Local `.env` files, Firebase service-account files, `google-services.json`, TLS private keys, model weights, build outputs, and user/device tokens are environment-specific or sensitive and must not be committed. Use `.env.example` files only as templates and keep actual values local. Before committing, review `git status`, the staged diff, and ignored/untracked files.

## Development workflow

Create a feature branch when appropriate, make a focused change, and run the relevant backend tests, dashboard build, or mobile checks before committing. Review `git diff` and `git status` to ensure only intended files are included. Do not commit generated bundles, local configuration, credentials, or model weights. Push to the configured remote branch without rewriting shared history.
