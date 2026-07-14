# Dashboard — Urban Sentinel (Authority Admin Panel)

React + Vite + TailwindCSS. Internal tool for authorities — **not** the
primary product (that's `mobile/`).

## Windows setup (PowerShell)

```powershell
cd dashboard

# 1. Install dependencies (Node.js 20 LTS required — node --version to check)
npm install

# 2. Run the dev server
npm run dev
```

Open http://localhost:5173 — you should see "Urban Sentinel — Authority
dashboard skeleton — Session 1".

## Structure

```
dashboard/
├── src/
│   ├── main.jsx     React root
│   ├── App.jsx      Skeleton page only, for now
│   └── index.css    Tailwind entrypoint
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

No live devices, incident table, maps, or analytics yet — Session 7
builds those out.
