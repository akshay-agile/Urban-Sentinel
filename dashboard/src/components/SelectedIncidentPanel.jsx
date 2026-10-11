import { AlertTriangle, Clock3, MapPin, RadioTower, Target } from 'lucide-react';

const HAZARD_LABELS = {
  fire: 'Fire / smoke',
  flood: 'Flood / waterlogging',
  accident: 'Road accident',
  gas_leak: 'Gas leak',
  structural_damage: 'Structural damage',
  temperature_spike: 'Temperature spike',
  explosion: 'Explosion',
};

const SEVERITY_CLASS = {
  low: 'text-severity-low',
  medium: 'text-severity-medium',
  high: 'text-severity-high',
  critical: 'text-severity-critical',
};

function Detail({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-ink-muted"><Icon size={15} /></span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        <div className="mt-1 text-sm text-ink">{children}</div>
      </div>
    </div>
  );
}

export default function SelectedIncidentPanel({ incident }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-card" aria-labelledby="selected-incident-title">
      <div className="mb-5 flex items-center gap-2">
        <AlertTriangle size={16} className="text-primary" />
        <h2 id="selected-incident-title" className="text-sm font-semibold text-ink">Selected incident</h2>
      </div>

      {!incident ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-sm text-ink-muted">
          Select an incident from the map or priority queue to inspect its recorded details.
        </p>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="text-lg font-semibold text-ink">{HAZARD_LABELS[incident.incident_type] || incident.incident_type.replaceAll('_', ' ')}</p>
              <p className="mt-1 font-mono text-xs text-ink-muted">Incident #{incident.id}</p>
            </div>
            <span className={`rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${SEVERITY_CLASS[incident.severity] || 'text-ink-soft'}`}>
              {incident.severity}
            </span>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Detail icon={MapPin} label="Coordinates">
              {Number(incident.latitude).toFixed(6)}, {Number(incident.longitude).toFixed(6)}
            </Detail>
            <Detail icon={Target} label="Alert radius">{incident.radius_meters} m</Detail>
            <Detail icon={Clock3} label="Detected">
              <time dateTime={incident.detected_at}>{new Date(incident.detected_at).toLocaleString()}</time>
            </Detail>
            <Detail icon={RadioTower} label="Status">
              <span className={incident.status === 'active' ? 'text-success' : 'text-ink-soft'}>{incident.status}</span>
            </Detail>
          </div>
        </>
      )}
    </section>
  );
}
