import { useCallback, useState } from 'react';

import { getAllIncidents } from '../api/endpoints';
import { usePolling } from '../api/usePolling';
import IncidentTable from '../components/IncidentTable';

export default function IncidentsPage() {
  const [filter, setFilter] = useState('all'); // all | active | resolved
  const fetcher = useCallback(() => getAllIncidents(), []);
  const { data: incidents, isLoading, error, refresh } = usePolling(fetcher, 5000);

  const incidentList = (incidents || []).filter((i) => filter === 'all' || i.status === filter);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold">Incidents</h2>
        <div className="flex gap-2">
          {['all', 'active', 'resolved'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-md capitalize ${
                filter === f ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <p className="text-slate-500 text-sm mb-6">Full incident record. Manual creation available via /docs (Session 5) until Session 11's rule engine.</p>

      {error && <p className="text-red-400 mb-4">Couldn't load incidents. Is the backend running?</p>}
      {isLoading ? <p className="text-slate-500">Loading…</p> : <IncidentTable incidents={incidentList} onChanged={refresh} />}
    </div>
  );
}
