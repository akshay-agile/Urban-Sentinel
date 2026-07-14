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

No API endpoints, no MQTT, and no business logic yet — that's Sessions 3–5.
