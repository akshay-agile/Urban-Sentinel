from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

try:
    db.execute(
        text("ALTER TYPE incidenttypeenum ADD VALUE IF NOT EXISTS 'accident'")
    )
    db.commit()
    print("ACCIDENT ENUM ADDED")
finally:
    db.close()