import { useCallback, useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Activity, AlertTriangle, BarChart3, Circle, LayoutDashboard, Radio } from 'lucide-react';

import { useLiveSocket } from '../api/useLiveSocket';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true, icon: LayoutDashboard },
  { to: '/devices', label: 'Devices', icon: Radio },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

function Navigation({ compact = false }) {
  return (
    <nav className={compact ? 'flex min-w-max gap-2 px-4 pb-3' : 'space-y-1 px-3'} aria-label="Main navigation">
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
                  : `px-3.5 py-3 text-sm ${isActive ? 'bg-primary-soft text-primary shadow-glow' : 'text-ink-soft hover:bg-panel hover:text-ink'}`
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
      aria-label={isConnected ? 'Live feed connected' : 'Live feed offline; polling for updates'}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {isConnected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-40" />}
        <Circle
          size={8}
          className={`relative ${isConnected ? 'fill-success text-success' : 'fill-ink-muted text-ink-muted'}`}
        />
      </span>
      <span className={isConnected ? 'text-success' : 'text-ink-muted'}>
        {compact ? (isConnected ? 'Live' : 'Polling') : isConnected ? 'Live feed connected' : 'Live feed offline · polling'}
      </span>
    </div>
  );
}

export default function Layout() {
  const [liveEvents, setLiveEvents] = useState([]);
  const [latestEvent, setLatestEvent] = useState(null);
  const onLiveEvent = useCallback((event) => {
    const receivedAt = Date.now();
    const receivedEvent = {
      ...event,
      receivedAt,
      eventKey: `${receivedAt}-${event.id || event.device_id || event.type}`,
    };
    setLatestEvent(receivedEvent);
    if (!['incident_created', 'incident_updated', 'device_registered'].includes(event.type)) return;
    setLiveEvents((current) => [
      receivedEvent,
      ...current,
    ].slice(0, 30));
  }, []);
  const { isConnected } = useLiveSocket(onLiveEvent);
  const outletContext = useMemo(
    () => ({ isConnected, liveEvents, latestEvent }),
    [isConnected, liveEvents, latestEvent]
  );

  return (
    <div className="min-h-screen bg-surface text-ink lg:flex">
      <aside className="hidden w-[264px] shrink-0 border-r border-line bg-card lg:flex lg:flex-col">
        <div className="border-b border-line px-6 py-7">
          <div className="inline-flex max-w-full rounded-xl bg-[#EAF1FB] px-2 py-1.5 shadow-card">
            <img
              src="/urban-sentinel-logo.png"
              alt="Urban Sentinel — Detect. Alert. Protect."
              className="h-auto w-full max-w-[220px] object-contain object-left"
            />
          </div>
          <p className="mt-3 pl-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
            Authority operations
          </p>
        </div>

        <div className="px-6 pb-3 pt-7 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
          Workspace
        </div>
        <Navigation />

        <div className="mt-auto border-t border-line px-6 py-5">
          <ConnectionStatus isConnected={isConnected} />
          <div className="mt-4 flex items-center gap-2 text-[11px] text-ink-muted">
            <Activity size={13} />
            <span>Urban Sentinel · v0.1.0</span>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-[1000] border-b border-line bg-card/95 shadow-card backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex h-14 w-[158px] items-center rounded-lg bg-[#EAF1FB] px-1.5 shadow-card">
              <img
                src="/urban-sentinel-logo.png"
                alt="Urban Sentinel"
                className="h-auto w-full object-contain object-left"
              />
            </div>
            <ConnectionStatus isConnected={isConnected} compact />
          </div>
          <div className="overflow-x-auto">
            <Navigation compact />
          </div>
        </header>

        <main className="mx-auto min-h-screen w-full max-w-[1680px] px-4 py-6 sm:px-6 sm:py-8 lg:px-9 xl:px-11">
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
}
