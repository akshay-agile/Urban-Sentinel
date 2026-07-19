"""
Urban Sentinel — Backend Entrypoint

Session 8: MQTT subscriber now starts automatically as part of this app's
lifespan (see `lifespan()` below) instead of needing its own terminal.
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.router import api_router
from app.core.config import get_settings
from app.db.session import get_db
from app.mqtt import subscriber as mqtt_subscriber
from app.mqtt.client import build_client
from app.mqtt.client import connect as mqtt_connect
from app.services.push_delivery import init_firebase
from app.ws.manager import manager as ws_manager
from app.ws.routes import router as ws_router

# Without this, our own logger.info/.warning calls below are silently
# dropped — uvicorn configures its own loggers, but not this app's.
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

settings = get_settings()
logger = logging.getLogger("urban_sentinel.main")

MQTT_CONNECT_RETRIES = 5
MQTT_CONNECT_RETRY_DELAY_SECONDS = 3


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Starts the MQTT subscriber automatically when the backend starts —
    Sessions 3-7 required a second terminal running
    `python -m app.mqtt.subscriber`; from Session 8 onward that happens
    for you. Also bridges MQTT's own background thread into the FastAPI
    event loop so sensor readings and device registrations can broadcast
    live over WebSocket.
    """
    loop = asyncio.get_running_loop()

    firebase_ready = init_firebase()
    app.state.firebase_ready = firebase_ready

    def schedule_broadcast(event: dict) -> None:
        # MQTT callbacks run on paho's own thread, not the asyncio loop —
        # this hands the coroutine back to the loop thread safely.
        asyncio.run_coroutine_threadsafe(ws_manager.broadcast(event), loop)

    mqtt_subscriber.set_broadcast_callback(schedule_broadcast)

    client = build_client(client_id="urban-sentinel-backend-embedded")
    client.on_connect = mqtt_subscriber.on_connect
    client.on_message = mqtt_subscriber.on_message

    connected = False
    for attempt in range(1, MQTT_CONNECT_RETRIES + 1):
        try:
            mqtt_connect(client)
            connected = True
            break
        except OSError as exc:
            logger.warning(
                "MQTT connect attempt %d/%d failed (%s); retrying in %ds",
                attempt,
                MQTT_CONNECT_RETRIES,
                exc,
                MQTT_CONNECT_RETRY_DELAY_SECONDS,
            )
            await asyncio.sleep(MQTT_CONNECT_RETRY_DELAY_SECONDS)

    if connected:
        client.loop_start()
        logger.info("MQTT subscriber started (embedded)")
    else:
        logger.error(
            "Could not reach the MQTT broker after %d attempts — sensor ingestion is disabled. "
            "Is Mosquitto running? The rest of the API still works.",
            MQTT_CONNECT_RETRIES,
        )

    app.state.mqtt_client = client
    app.state.mqtt_connected = connected

    yield

    if connected:
        client.loop_stop()
        client.disconnect()
    mqtt_subscriber.set_broadcast_callback(None)


app = FastAPI(
    title="Urban Sentinel API",
    description="AI-powered IoT Emergency Intelligence Platform — backend",
    version="0.1.0",
    lifespan=lifespan,
)

# The dashboard runs in a browser — unlike the mobile app, browsers
# enforce CORS, so the dev server's origin needs an explicit allow-list.
# Wide open for local development; would need tightening for any real
# deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
app.include_router(ws_router)


@app.get("/health", tags=["system"])
async def health_check():
    """Basic liveness check used to confirm the server is running."""
    return {"status": "ok", "service": "urban-sentinel-backend", "env": settings.environment}


@app.get("/health/db", tags=["system"])
async def db_health_check(db: Session = Depends(get_db)):
    """
    Verifies the app can actually reach PostgreSQL and query it — separate
    from /health so a DB outage doesn't look like a backend outage.
    """
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}


@app.get("/health/mqtt", tags=["system"])
async def mqtt_health_check():
    """Reflects whether the embedded MQTT subscriber (Session 8) is connected."""
    connected = getattr(app.state, "mqtt_connected", False)
    return {"status": "ok" if connected else "disconnected", "mqtt_connected": connected}


@app.get("/health/firebase", tags=["system"])
async def firebase_health_check():
    """Reflects whether Firebase Admin SDK (Session 10, Android FCM push) is configured."""
    ready = getattr(app.state, "firebase_ready", False)
    return {
        "status": "ok" if ready else "not_configured",
        "firebase_ready": ready,
        "note": None if ready else "iOS local notifications still work; only Android FCM push is affected.",
    }
