# Mobile — Urban Sentinel (Citizen App)

React Native app built with **Expo SDK 52**. This is the **primary
product** — the app citizens install to receive emergency alerts.

## Windows setup (PowerShell)

```powershell
cd mobile

# 1. Install dependencies (Node.js 20 LTS required — node --version to check)
npm install

# 2. Start the Expo dev server
npx expo start
```

This opens the Expo Dev Tools in your browser with a QR code.

## Running on your iPhone (no Mac / no Apple Developer account needed for now)

1. Install **Expo Go** from the App Store on your iPhone.
2. Make sure your iPhone and your Windows PC are on the **same Wi-Fi network**.
3. Scan the QR code shown by `npx expo start` using your iPhone's Camera app.
4. It opens directly in Expo Go — no Xcode, no Mac, no paid Apple Developer
   account required for this stage.

This covers development testing. A Mac + Apple Developer account is only
needed later, for building a standalone `.ipa` / TestFlight release —
that's out of scope until much later in the project.

## Structure

```
mobile/
├── App.js          Entry point — skeleton screen only for now
├── app.json        Expo config (name, bundle id, permissions)
├── package.json
├── babel.config.js
└── assets/         Icons/images — add app icon & splash here
```

## Session 6 — Connecting to your backend (Windows)

Your phone is a **different device** from your PC — `localhost` in the
app means the phone itself, not your computer. You need your PC's actual
LAN IP address.

### 1. Find your PC's LAN IP

```powershell
ipconfig
```

Look for **IPv4 Address** under your active adapter (Wi-Fi, usually).
It'll look like `192.168.1.42`. Your phone and PC must be on the **same
Wi-Fi network**.

### 2. Set it in the app

Edit `mobile/src/config.js`:

```js
export const API_BASE_URL = 'http://192.168.1.42:8000/api/v1'; // your actual IP
```

### 3. Start the backend so it's reachable on your network

By default `uvicorn` only listens on `localhost`, which your phone can't
reach even with the right IP. Bind to all interfaces instead:

```powershell
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Allow it through Windows Firewall

The first time you do this, Windows may show a firewall prompt — click
**Allow access** (for Private networks at least). If you don't see a
prompt and the app still can't connect, add a rule manually:

```powershell
New-NetFirewallRule -DisplayName "Urban Sentinel Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

### 5. Install new dependencies and run

```powershell
cd mobile
npm install
npx expo start
```

Scan the QR with Expo Go. Try: Register → should land on Home → tap
"Enable location" → grant permission → check Profile shows your
coordinates → check Nearby Incidents loads (will be empty unless you've
created incidents via `/docs` in Session 5).

### Troubleshooting

- **"Network Error" on Login/Register**: usually the IP in `config.js` is
  wrong, or `--host 0.0.0.0` wasn't used, or the firewall is blocking it.
  Test by opening `http://<your-ip>:8000/health` in your **phone's**
  browser — if that doesn't load, the app won't be able to reach it either.
- **Works on Wi-Fi at home but not elsewhere**: expected — your PC and
  phone need to be on the same network. Public/campus Wi-Fi sometimes
  blocks device-to-device traffic entirely (client isolation).
- **Metro shows `exp://127.0.0.1:8081` instead of your LAN IP**: some
  Windows setups (multiple network adapters, VPN software, etc.) confuse
  Expo's auto-detection. Force it explicitly:
  ```powershell
  $env:REACT_NATIVE_PACKAGER_HOSTNAME = "192.168.1.5"   # your actual IP
  npx expo start
  ```
  Confirm the terminal now shows `Metro waiting on exp://192.168.1.5:8081`
  before scanning.
- **"Project is incompatible with this version of Expo Go" (SDK
  mismatch)**: the App Store/Play Store only ever distributes the latest
  Expo Go, which only opens projects on the matching SDK. This project is
  pinned to **SDK 54** — if `npm install` somehow lands you on an older
  SDK, run `npx expo install expo@^54.0.0 && npx expo install --fix`, then
  delete `node_modules` + `package-lock.json` and reinstall.
