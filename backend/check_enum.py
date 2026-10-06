from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

try:
    result = db.execute(
        text("SELECT unnest(enum_range(NULL::incidenttypeenum))::text")
    )
    print(result.scalars().all())
finally:
    db.close()