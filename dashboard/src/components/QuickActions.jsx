import { Link } from 'react-router-dom';
import { BarChart3, MapPinned, Radio, Siren } from 'lucide-react';

const ACTIONS = [
  { to: '/incidents', label: 'Review incidents', detail: 'Filter and resolve reports', icon: Siren, tone: 'bg-danger-soft text-danger' },
  { to: '/devices', label: 'Device registry', detail: 'Inspect registered devices', icon: Radio, tone: 'bg-info-soft text-info' },
  { to: '/analytics', label: 'Open analytics', detail: 'Review returned API records', icon: BarChart3, tone: 'bg-[#F0EDFA] text-[#6652A3]' },
];

export default function QuickActions() {
  return (
    <section className="rounded-2xl border border-line bg-card shadow-card" aria-labelledby="quick-actions-title">
      <header className="border-b border-line px-5 py-4">
        <h2 id="quick-actions-title" className="text-sm font-semibold text-ink">Quick actions</h2>
        <p className="mt-1 text-xs text-ink-muted">Shortcuts to current dashboard workflows</p>
      </header>
      <div className="grid grid-cols-2 gap-2.5 p-3">
        <button type="button" onClick={() => document.getElementById('incident-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="group rounded-xl border border-line bg-surface p-3 text-left transition hover:border-primary/30 hover:bg-primary-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary"><MapPinned size={16}/></span>
          <span className="block text-xs font-semibold text-ink">Open city map</span>
          <span className="mt-1 block text-[10px] text-ink-muted">Focus on incident locations</span>
        </button>
        {ACTIONS.map(({ to, label, detail, icon: Icon, tone }) => (
          <Link key={to} to={to} className="group rounded-xl border border-line bg-surface p-3 transition hover:border-primary/30 hover:bg-primary-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <span className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}><Icon size={16}/></span>
            <span className="block text-xs font-semibold text-ink">{label}</span>
            <span className="mt-1 block text-[10px] text-ink-muted">{detail}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
