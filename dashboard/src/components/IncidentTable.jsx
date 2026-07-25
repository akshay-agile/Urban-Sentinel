import { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';

import { resolveIncident } from '../api/endpoints';

const SEVERITY_STYLES = {
  low: 'bg-success-soft text-success',
  medium: 'bg-warning-soft text-warning',
  high: 'bg-orange-50 text-orange-600',
  critical: 'bg-danger-soft text-danger',
};

const INCIDENT_ICON_COLORS = {
  fire: 'text-orange-500',
  gas_leak: 'text-amber-500',
  flood: 'text-blue-500',
  structural_damage: 'text-slate-500',
  temperature_spike: 'text-red-500',
  explosion: 'text-danger',
};

export default function IncidentTable({ incidents, onChanged }) {
  const [resolvingId, setResolvingId] = useState(null);

  const handleResolve = async (id) => {
    setResolvingId(id);
    try {
      await resolveIncident(id);
      onChanged?.();
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="bg-card border border-line rounded-2xl overflow-hidden shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-ink-muted text-xs uppercase tracking-wide">
            <th className="text-left px-5 py-3 font-medium">Type</th>
            <th className="text-left px-5 py-3 font-medium">Severity</th>
            <th className="text-left px-5 py-3 font-medium">Status</th>
            <th className="text-left px-5 py-3 font-medium">Radius</th>
            <th className="text-left px-5 py-3 font-medium">Detected</th>
            <th className="text-left px-5 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr key={incident.id} className="border-b border-line last:border-0 hover:bg-surface/60 transition-colors">
              <td className="px-5 py-3.5">
                <span className="flex items-center gap-2 capitalize text-ink font-medium">
                  <AlertTriangle size={15} className={INCIDENT_ICON_COLORS[incident.incident_type] || 'text-ink-muted'} />
                  {incident.incident_type.replace('_', ' ')}
                </span>
              </td>
              <td className="px-5 py-3.5">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                    SEVERITY_STYLES[incident.severity] || 'bg-surface text-ink-soft'
                  }`}
                >
                  {incident.severity}
                </span>
              </td>
              <td className="px-5 py-3.5">
                <span className={incident.status === 'active' ? 'text-danger font-medium' : 'text-ink-muted'}>
                  {incident.status}
                </span>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">{incident.radius_meters}m</td>
              <td className="px-5 py-3.5 text-ink-muted">{new Date(incident.detected_at).toLocaleString()}</td>
              <td className="px-5 py-3.5">
                {incident.status === 'active' ? (
                  <button
                    onClick={() => handleResolve(incident.id)}
                    disabled={resolvingId === incident.id}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-surface hover:bg-line text-ink border border-line disabled:opacity-50 transition-colors"
                  >
                    <Check size={13} />
                    {resolvingId === incident.id ? 'Resolving…' : 'Resolve'}
                  </button>
                ) : (
                  <span className="text-xs text-ink-muted">—</span>
                )}
              </td>
            </tr>
          ))}
          {incidents.length === 0 && (
            <tr>
              <td colSpan={6} className="px-5 py-16 text-center text-ink-muted">
                No incidents to show.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
