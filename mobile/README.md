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

No screens, navigation, or API calls are wired in yet — Session 6 adds
Login, Register, Home, Alerts, Nearby Incidents, History, Profile, and
Settings screens. Session 10 wires in Firebase push notifications.
