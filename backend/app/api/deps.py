"""
Re-exported so route modules import from app.api.deps rather than reaching
into app.db directly — keeps the DB layer swappable without touching
every router.
"""
from app.db.session import get_db  # noqa: F401
