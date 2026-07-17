"""
Urban Sentinel — Backend Entrypoint

Session 1: skeleton only. No routers, no DB, no MQTT wired in yet.
Those are added in Sessions 2, 3, and 5.
"""
from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.router import api_router
from app.core.config import get_settings
from app.db.session import get_db

settings = get_settings()

app = FastAPI(
    title="Urban Sentinel API",
    description="AI-powered IoT Emergency Intelligence Platform — backend",
    version="0.1.0",
)

app.include_router(api_router, prefix="/api/v1")


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
