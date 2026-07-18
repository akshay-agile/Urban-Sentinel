import { NavLink, Outlet } from 'react-router-dom';

import { useLiveSocket } from '../api/useLiveSocket';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/devices', label: 'Devices' },
  { to: '/incidents', label: 'Incidents' },
  { to: '/analytics', label: 'Analytics' },
];

export default function Layout() {
  // No-op handler — this instance exists purely to show connection status
  // in the sidebar; each page also connects its own instance to react to
  // events. Multiple WebSocket connections from one tab is fine at this
  // scale.
  const { isConnected } = useLiveSocket(() => {});

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <aside className="w-56 shrink-0 border-r border-slate-800 flex flex-col">
        <div className="px-5 py-6">
          <h1 className="text-lg font-bold">Urban Sentinel</h1>
          <p className="text-xs text-slate-500 mt-1">Authority Dashboard</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className={isConnected ? 'text-green-400' : 'text-slate-500'}>
              {isConnected ? 'Live feed connected' : 'Live feed offline (polling)'}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-2">v0.1.0 · Session 8</p>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
