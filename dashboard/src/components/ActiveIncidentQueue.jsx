import { useState } from 'react';
import { Check, MapPin } from 'lucide-react';

import { resolveIncident } from '../api/endpoints';

const SEVERITY_STYLES = {
  low: 'bg-success-soft text-severity-low',
  medium: 'bg-warning-soft text-severity-medium',
  high: 'bg-severity-high/10 text-severity-high',
  critical: 'bg-danger-soft text-severity-critical',
};

const HAZARD_STYLES = {
  fire: 'bg-danger-soft text-hazard-fire',
  flood: 'bg-info-soft text-hazard-flood',
  accident: 'bg-[#FFF0DF] text-hazard-accident',
};

const HAZARD_LABELS = {
  fire: 'Fire / smoke',
  flood: 'Flood / waterlogging',
  accident: 'Road accident',
  gas_leak: 'Gas leak',
  structural_damage: 'Structural damage',
  temperature_spike: 'Temperature spike',
  explosion: 'Explosion',
};

function formatIncidentTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString();
}

export default function ActiveIncidentQueue({ incidents, selectedIncidentId, onSelect, onResolved, emptyMessage, emptyHint }) {
  const [resolvingId, setResolvingId] = useState(null);
  const [errorById, setErrorById] = useState({});

  const resolve = async (incidentId) => {
    setResolvingId(incidentId);
    setErrorById((current) => ({ ...current, [incidentId]: '' }));
    try {
      await resolveIncident(incidentId);
      onResolved?.();
    } catch {
      setErrorById((current) => ({ ...current, [incidentId]: 'Could not resolve. Check the API connection and retry.' }));
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <section className="flex min-h-[260px] flex-col self-start overflow-hidden rounded-[15px] border border-line bg-card shadow-card" aria-labelledby="active-queue-title">
      <header className="flex items-center justify-between border-b border-line px-4 py-[14px]">
        <div>
          <h2 id="active-queue-title" className="text-[13px] font-bold text-ink">Priority incident queue</h2>
          <p className="mt-1 text-[10px] text-ink-muted">Active reports · highest severity first</p>
        </div>
        <span className="rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-sm font-semibold text-ink">
          {incidents.length}
        </span>
      </header>

      {incidents.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-5 py-8 text-center">
          <div>
            <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">✓</span>
            <p className="text-sm font-medium text-ink">{emptyMessage || 'No active incidents'}</p>
            <p className="mt-1 text-xs text-ink-muted">{emptyHint || 'New active reports will appear here.'}</p>
          </div>
        </div>
      ) : (
        <ol className="max-h-[520px] divide-y divide-line overflow-y-auto">
          {incidents.map((incident, index) => {
            const selected = incident.id === selectedIncidentId;
            const hazardStyle = HAZARD_STYLES[incident.incident_type] || 'text-ink-soft';
            return (
              <li key={incident.id} className={selected ? 'bg-primary-soft/40' : ''}>
                <div className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => onSelect(incident.id)}
                    aria-pressed={selected}
                    className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="font-mono text-[10px] text-ink-muted">{String(index + 1).padStart(2, '0')}</span>
                          <span className={`truncate rounded-full px-2.5 py-1 text-xs font-semibold ${hazardStyle}`}>
                            {HAZARD_LABELS[incident.incident_type] || incident.incident_type.replaceAll('_', ' ')}
                          </span>
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                          <MapPin size={12} className="shrink-0" />
                          {Number(incident.latitude).toFixed(4)}, {Number(incident.longitude).toFixed(4)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${SEVERITY_STYLES[incident.severity] || 'bg-panel text-ink-soft'}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
                      <time dateTime={incident.detected_at}>{formatIncidentTime(incident.detected_at)}</time>
                      <span className="text-success">{incident.status}</span>
                      <span>{incident.radius_meters} m radius</span>
                    </div>
                  </button>

                  {errorById[incident.id] ? <p className="mt-2 text-xs text-danger">{errorById[incident.id]}</p> : null}
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => resolve(incident.id)}
                      disabled={resolvingId === incident.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-medium text-ink-soft transition hover:border-success/50 hover:text-success disabled:cursor-wait disabled:opacity-50"
                    >
                      <Check size={12} />
                      {resolvingId === incident.id ? 'Resolving…' : 'Resolve'}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
