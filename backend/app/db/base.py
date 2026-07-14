"""
Imported by alembic/env.py so `--autogenerate` can see every model's
metadata via app.db.base_class.Base. Import order doesn't matter here,
just that everything gets registered.
"""
from app.db.base_class import Base  # noqa: F401
from app.models import (  # noqa: F401
    Device,
    Incident,
    Notification,
    SensorReading,
    User,
)
