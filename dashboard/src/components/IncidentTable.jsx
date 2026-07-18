import { useState } from 'react';

import { resolveIncident } from '../api/endpoints';

const SEVERITY_STYLES = {
  low: 'bg-green-500/20 text-green-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-slate-500 text-xs uppercase">
          <tr className="border-b border-slate-800">
            <th className="text-left px-4 py-3">Type</th>
            <th className="text-left px-4 py-3">Severity</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Radius</th>
            <th className="text-left px-4 py-3">Detected</th>
            <th className="text-left px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr key={incident.id} className="border-b border-slate-800 last:border-0">
              <td className="px-4 py-3 capitalize text-slate-200">{incident.incident_type.replace('_', ' ')}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${
                    SEVERITY_STYLES[incident.severity] || 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {incident.severity}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={incident.status === 'active' ? 'text-red-400' : 'text-slate-500'}>
                  {incident.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-400">{incident.radius_meters}m</td>
              <td className="px-4 py-3 text-slate-500">{new Date(incident.detected_at).toLocaleString()}</td>
              <td className="px-4 py-3">
                {incident.status === 'active' ? (
                  <button
                    onClick={() => handleResolve(incident.id)}
                    disabled={resolvingId === incident.id}
                    className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-50"
                  >
                    {resolvingId === incident.id ? 'Resolving…' : 'Resolve'}
                  </button>
                ) : (
                  <span className="text-xs text-slate-600">—</span>
                )}
              </td>
            </tr>
          ))}
          {incidents.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                No incidents to show.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
