# Dashboard — Urban Sentinel (Authority Admin Panel)

React + Vite + TailwindCSS + Leaflet + Chart.js. Internal tool for
authorities — **not** the primary product (that's `mobile/`).

**Design system**: light theme, Deep Blue (`#2563EB`) primary / Emerald
(`#10B981`) secondary, Inter typeface, Lucide icons — see
`tailwind.config.js` for the full token set (`primary`, `secondary`,
`surface`, `card`, `ink`, `line`, `danger`, `warning`, `success`, `info`).
Every component uses these theme classes rather than raw hex values, so
retheming later stays a one-file change.

## Windows setup (PowerShell)

```powershell
cd dashboard

# 1. Install dependencies (Node.js 20 LTS required — node --version to check)
npm install

# 2. Create your local .env
copy .env.example .env
```

The default `.env` points at `http://localhost:8000/api/v1` — correct as
long as you run the dashboard on the same PC as the backend (normal case,
since this runs in your browser, not on a separate device like the phone
does).

### 3. Make sure the backend allows the dashboard's origin

CORS is now enabled on the backend (`backend/app/main.py`) — no extra
setup needed here, just make sure you've pulled the latest backend code
too (`pip install -r requirements.txt` isn't needed for this change, it's
pure code).

### 4. Run

```powershell
npm run dev
```

Open http://localhost:5173.

## What's on each page

| Page | Shows |
|---|---|
| **Overview** | Stat cards (devices, live count, active incidents, critical count), a map of every device + active incident with its alert radius, and the active incident table |
| **Devices** | Every registered node, live/idle status (live = a reading in the last 15s), map |
| **Incidents** | Full incident history, filterable by All/Active/Resolved, with a Resolve button |
| **Analytics** | Totals, incidents-by-type bar chart, incidents-by-severity doughnut chart |

Everything polls the backend every 5–10 seconds — no websockets yet
(that's more naturally Session 8's territory once the full pipeline is
wired together), but it updates on its own without manual refreshing.

## Seeing real data

With the backend, Postgres, Mosquitto, and the Session 4 simulator all
running (see their respective READMEs), start the simulator in `fire`
mode and switch through a couple of others — devices will appear within
~5 seconds, live-tagged. To see incidents, either create some manually via
http://localhost:8000/docs (`POST /api/v1/incidents/`, using a device's
numeric `id` from the Devices page) — real auto-detection from sensor
readings is Session 11's rule engine, not yet built.

## Structure

```
dashboard/
├── src/
│   ├── api/
│   │   ├── client.js        Axios instance
│   │   ├── endpoints.js      getDevices, getAllIncidents, resolveIncident, etc.
│   │   └── usePolling.js     Simple polling hook (no websockets yet)
│   ├── components/
│   │   ├── Layout.jsx         Sidebar nav
│   │   ├── StatCard.jsx
│   │   ├── DeviceTable.jsx
│   │   ├── IncidentTable.jsx  Includes Resolve action
│   │   ├── IncidentMap.jsx    Leaflet — devices + incident radius circles
│   │   └── charts/             IncidentsByTypeChart.jsx, SeverityChart.jsx
│   ├── pages/                  DashboardHome, DevicesPage, IncidentsPage, AnalyticsPage
│   ├── App.jsx                 Router
│   └── main.jsx
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

No login/auth wall on this internal tool for now — not in this session's
scope; can be added later if you want to gate it.

