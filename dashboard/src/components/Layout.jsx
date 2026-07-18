import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/devices', label: 'Devices' },
  { to: '/incidents', label: 'Incidents' },
  { to: '/analytics', label: 'Analytics' },
];

export default function Layout() {
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
        <div className="px-5 py-4 text-xs text-slate-600 border-t border-slate-800">v0.1.0 · Session 7</div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
