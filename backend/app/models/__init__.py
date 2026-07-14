"""
Import every model here so a single `from app.models import *`-style import
(and Alembic's autogenerate, via app/db/base.py) sees the full metadata.
"""
from app.models.device import Device          # noqa: F401
from app.models.incident import Incident      # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.sensor_reading import SensorReading  # noqa: F401
from app.models.user import User              # noqa: F401
