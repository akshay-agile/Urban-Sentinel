import { useState } from 'react';
import { AlertTriangle, Check, MapPin } from 'lucide-react';

import { resolveIncident } from '../api/endpoints';

const SEVERITY_STYLES = {
  low: 'bg-success-soft text-severity-low',
  medium: 'bg-warning-soft text-severity-medium',
  high: 'bg-severity-high/10 text-severity-high',
  critical: 'bg-danger-soft text-severity-critical',
};
const INCIDENT_ICON_COLORS = {
  fire: 'text-hazard-fire', flood: 'text-hazard-flood', accident: 'text-hazard-accident',
  gas_leak: 'text-hazard-gas', structural_damage: 'text-hazard-structural',
  temperature_spike: 'text-severity-critical', explosion: 'text-severity-critical',
};

export default function IncidentTable({ incidents, onChanged, selectedId, onSelect, onResolveResult }) {
  const [resolvingId, setResolvingId] = useState(null);

  const handleResolve = async (incident) => {
    setResolvingId(incident.id);
    onResolveResult?.(null);
    try {
      await resolveIncident(incident.id);
      onResolveResult?.({ type: 'success', text: `Incident #${incident.id} was marked resolved.` });
      onChanged?.();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      onResolveResult?.({ type: 'error', text: `Could not resolve incident #${incident.id}${detail ? `: ${detail}` : '. Check the API connection and try again.'}` });
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card shadow-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead><tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-ink-muted">
          <th className="px-4 py-3 font-semibold">Hazard</th><th className="px-4 py-3 font-semibold">Severity</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Location</th><th className="px-4 py-3 font-semibold">Detected</th><th className="px-4 py-3 font-semibold">Action</th>
        </tr></thead>
        <tbody>{incidents.map((incident) => (
          <tr key={incident.id} className={`border-b border-line last:border-0 transition-colors ${incident.id === selectedId ? 'bg-primary-soft/50' : 'hover:bg-surface/60'}`}>
            <td className="px-4 py-3.5"><button type="button" onClick={() => onSelect?.(incident.id)} className="flex items-center gap-2 text-left text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><AlertTriangle size={15} className={INCIDENT_ICON_COLORS[incident.incident_type] || 'text-ink-muted'}/><span><span className="block font-medium capitalize">{incident.incident_type.replaceAll('_', ' ')}</span><span className="font-mono text-[10px] text-ink-muted">#{incident.id}</span></span></button></td>
            <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${SEVERITY_STYLES[incident.severity] || 'bg-surface text-ink-soft'}`}>{incident.severity}</span></td>
            <td className="px-4 py-3.5"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize ${incident.status === 'active' ? 'border-danger/25 bg-danger-soft text-danger' : 'border-line bg-surface text-ink-muted'}`}>{incident.status}</span></td>
            <td className="px-4 py-3.5 text-xs text-ink-soft"><span className="inline-flex items-center gap-1"><MapPin size={12} className="text-ink-muted"/>{Number(incident.latitude).toFixed(4)}, {Number(incident.longitude).toFixed(4)}</span></td>
            <td className="px-4 py-3.5 text-xs text-ink-muted">{new Date(incident.detected_at).toLocaleString()}</td>
            <td className="px-4 py-3.5">{incident.status === 'active' ? <button type="button" onClick={() => handleResolve(incident)} disabled={resolvingId === incident.id} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition hover:border-success/40 hover:text-success disabled:opacity-50"><Check size={13}/>{resolvingId === incident.id ? 'Resolving…' : 'Resolve'}</button> : <span className="text-xs text-ink-muted">Resolved</span>}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
