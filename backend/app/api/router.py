"""
Aggregates every resource router under a single /api/v1 prefix, mounted
in app/main.py.
"""
from fastapi import APIRouter

from app.api.routes import auth, devices, incidents, notifications, sensor_readings

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(devices.router)
api_router.include_router(sensor_readings.router)
api_router.include_router(incidents.router)
api_router.include_router(notifications.router)
