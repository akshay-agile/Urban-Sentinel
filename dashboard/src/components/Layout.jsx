import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AlertTriangle, BarChart3, Bell, Camera, Circle, FileText, LayoutDashboard, MapPinned, Radio, UsersRound } from 'lucide-react';

import { useLiveSocket } from '../api/useLiveSocket';
import apiClient from '../api/client';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true, icon: LayoutDashboard },
      { to: '/cameras', label: 'Camera network', icon: Camera },
  { to: '/devices', label: 'Devices', icon: Radio },
      { to: '/responders', label: 'Responders', icon: UsersRound },
      { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

const SIDEBAR_GROUPS = [
  {
    label: 'Monitoring',
    items: [
      { to: '/', label: 'Overview', end: true, icon: LayoutDashboard },
      { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
      { to: '/#incident-map', label: 'City map', icon: MapPinned, mapAnchor: true },
      { to: '/cameras', label: 'Camera network', icon: Camera },
    ],
  },
  {
    label: 'Response',
    items: [
      { to: '/responders', label: 'Responders', icon: UsersRound },
      { to: '/notifications', label: 'Notifications', icon: Bell },
      // The existing Analytics page is the closest supported destination for Reports.
      { to: '/analytics', label: 'Reports', icon: FileText },
    ],
  },
];

function navItemClass(active, compact = false) {
  return `flex items-center gap-3 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
    compact
      ? `px-3 py-2 text-xs ${active ? 'bg-primary-soft text-primary' : 'text-ink-soft hover:bg-panel hover:text-ink'}`
      : `px-3 py-[11px] text-xs ${active ? 'bg-primary-soft text-primary font-bold' : 'text-ink-soft hover:bg-panel hover:text-ink'}`
  }`;
}

function Navigation({ compact = false }) {
  const location = useLocation();

  if (!compact) {
    return (
      <nav className="space-y-5" aria-label="Main navigation">
        {SIDEBAR_GROUPS.map((group) => (
          <section key={group.label} aria-label={group.label}>
            <h2 className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.14em] text-ink-muted">{group.label}</h2>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                if (item.unavailable) {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      disabled
                      title={`${item.label} is not implemented in this dashboard`}
                      aria-label={`${item.label}, not implemented`}
                      className={`${navItemClass(false)} w-full cursor-not-allowed opacity-70`}
                    >
                      <Icon size={16} strokeWidth={2} aria-hidden="true" />
                      {item.label}
                    </button>
                  );
                }

                if (item.mapAnchor) {
                  const active = location.pathname === '/' && location.hash === '#incident-map';
                  return (
                    <Link key={item.label} to={item.to} className={navItemClass(active)}>
                      <Icon size={16} strokeWidth={2} aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => navItemClass(isActive)}>
                    <Icon size={16} strokeWidth={2} aria-hidden="true" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    );
  }

  return (
    <nav className={compact ? 'flex min-w-max gap-1 px-4 pb-3' : 'space-y-1'} aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                compact
                  ? `px-3 py-2 text-xs ${isActive ? 'bg-primary-soft text-primary' : 'text-ink-soft hover:bg-panel hover:text-ink'}`
                  : `px-3 py-3 text-sm ${isActive ? 'bg-primary-soft text-primary' : 'text-ink-soft hover:bg-panel hover:text-ink'}`
              }`
            }
          >
            <Icon size={compact ? 15 : 17} strokeWidth={2} />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function ConnectionStatus({ isConnected, compact = false }) {
  return (
    <div
      className={`flex items-center gap-2 text-xs ${compact ? 'text-ink-soft' : ''}`}
      aria-label={isConnected ? 'Event feed connected' : 'Event feed disconnected'}
    >
      <Circle size={8} className={`shrink-0 ${isConnected ? 'fill-success text-success' : 'fill-ink-muted text-ink-muted'}`} />
      <span className={isConnected ? 'text-success' : 'text-ink-muted'}>
        {compact ? (isConnected ? 'Feed connected' : 'Feed disconnected') : isConnected ? 'Event feed connected' : 'Event feed disconnected'}
      </span>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const [liveEvents, setLiveEvents] = useState([]);
  const [latestEvent, setLatestEvent] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [signedIn, setSignedIn] = useState(Boolean(window.localStorage.getItem('urban_sentinel_access_token')));
  async function signIn(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try { const response = await apiClient.post('/auth/login', { email: form.get('email'), password: form.get('password') }); window.localStorage.setItem('urban_sentinel_access_token', response.data.access_token); setSignedIn(true); setAuthMessage('Signed in.'); setLoginOpen(false); }
    catch (error) { setAuthMessage(error.response?.data?.detail || 'Sign-in failed. Check credentials and API connection.'); }
  }
  const onLiveEvent = useCallback((event) => {
    const receivedAt = Date.now();
    const receivedEvent = {
      ...event,
      receivedAt,
      eventKey: `${receivedAt}-${event.id || event.device_id || event.type}`,
    };
    setLatestEvent(receivedEvent);
    if (!['incident_created', 'incident_updated', 'device_registered'].includes(event.type)) return;
    setLiveEvents((current) => [receivedEvent, ...current].slice(0, 30));
  }, []);
  const { isConnected } = useLiveSocket(onLiveEvent);
  const outletContext = useMemo(
    () => ({ isConnected, liveEvents, latestEvent }),
    [isConnected, liveEvents, latestEvent]
  );

  useEffect(() => {
    if (location.pathname === '/' && location.hash === '#incident-map') {
      document.getElementById('incident-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="sticky top-0 z-[1000] border-b border-line bg-white/95 shadow-card backdrop-blur">
        <div className="mx-auto flex h-[70px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/urban-sentinel-logo.png"
              alt="Urban Sentinel — Detect. Alert. Protect."
              className="h-[46px] w-auto max-w-[min(46vw,300px)] object-contain object-left"
            />
          </div>
          <div className="flex items-center gap-3"><div className="hidden sm:block"><ConnectionStatus isConnected={isConnected} /></div><button onClick={() => { if (signedIn) { window.localStorage.removeItem('urban_sentinel_access_token'); setSignedIn(false); setAuthMessage('Signed out.'); } else setLoginOpen(true); }} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink">{signedIn ? 'Sign out' : 'Authority sign in'}</button></div>
          <div className="sm:hidden"><ConnectionStatus isConnected={isConnected} compact /></div>
        </div>
        <div className="overflow-x-auto border-t border-line/70 lg:hidden">
          <Navigation compact />
        </div>
      </header>

      {loginOpen && <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/30 p-4"><form onSubmit={signIn} className="w-full max-w-sm space-y-3 rounded-2xl border border-line bg-white p-5 shadow-card"><h2 className="text-lg font-semibold">Authority sign in</h2><p className="text-xs text-ink-muted">Use your existing Urban Sentinel authority account.</p><input required type="email" name="email" autoComplete="username" placeholder="Email" className="w-full rounded-xl border border-line px-3 py-2 text-sm"/><input required type="password" name="password" autoComplete="current-password" placeholder="Password" className="w-full rounded-xl border border-line px-3 py-2 text-sm"/>{authMessage&&<p role="status" className="text-xs text-danger">{authMessage}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={()=>setLoginOpen(false)} className="rounded-lg border border-line px-3 py-2 text-sm">Cancel</button><button className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">Sign in</button></div></form></div>}
      {authMessage&&!loginOpen&&<div className="mx-auto max-w-[1600px] px-5 pt-2 text-xs text-ink-muted" role="status">{authMessage}</div>}

      <div className="mx-auto min-h-[calc(100vh-70px)] max-w-[1600px] lg:grid lg:grid-cols-[205px_minmax(0,1fr)]">
        <aside className="hidden border-r border-line bg-white px-3 py-5 lg:flex lg:flex-col">
          <Navigation />
          <div className="mx-1 mt-auto rounded-xl border border-line bg-[#F8FAFD] p-3">
            <p className="text-[11px] font-bold text-ink">Built for faster awareness</p>
            <p className="mt-1 text-[10px] leading-[1.5] text-ink-muted">One view of detected events, where they are happening, and what needs attention first.</p>
          </div>
        </aside>

        <main className="min-w-0 px-[clamp(15px,2.4vw,34px)] pb-10 pt-[25px]">
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
}
