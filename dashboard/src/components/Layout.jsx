import { NavLink, Outlet } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, Radio, AlertTriangle, BarChart3, Circle } from 'lucide-react';

import { useLiveSocket } from '../api/useLiveSocket';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true, icon: LayoutDashboard },
  { to: '/devices', label: 'Devices', icon: Radio },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Layout() {
  // No-op handler — this instance exists purely to show connection status
  // in the sidebar; each page also connects its own instance to react to
  // events.
  const { isConnected } = useLiveSocket(() => {});

  return (
    <div className="flex h-screen bg-surface text-ink">
      <aside className="w-60 shrink-0 border-r border-line bg-card flex flex-col">
        <div className="flex items-center gap-2.5 px-5 py-6">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-ink leading-tight">Urban Sentinel</h1>
            <p className="text-xs text-ink-muted leading-tight">Authority Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary-soft text-primary' : 'text-ink-soft hover:bg-surface hover:text-ink'
                  }`
                }
              >
                <Icon size={17} strokeWidth={2.2} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-line">
          <div className="flex items-center gap-2 text-xs">
            <Circle
              size={8}
              className={isConnected ? 'text-success fill-success animate-pulse' : 'text-ink-muted fill-ink-muted'}
            />
            <span className={isConnected ? 'text-success font-medium' : 'text-ink-muted'}>
              {isConnected ? 'Live feed connected' : 'Live feed offline (polling)'}
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-2">v0.1.0</p>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
