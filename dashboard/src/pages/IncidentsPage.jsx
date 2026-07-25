import { useCallback, useState } from 'react';

import { getAllIncidents } from '../api/endpoints';
import { usePolling } from '../api/usePolling';
import { useLiveSocket } from '../api/useLiveSocket';
import IncidentTable from '../components/IncidentTable';

const FILTERS = ['all', 'active', 'resolved'];

export default function IncidentsPage() {
  const [filter, setFilter] = useState('all');
  const fetcher = useCallback(() => getAllIncidents(), []);
  const { data: incidents, isLoading, error, refresh } = usePolling(fetcher, 5000);

  useLiveSocket((event) => {
    if (event.type === 'incident_created' || event.type === 'incident_updated') refresh();
  });

  const incidentList = (incidents || []).filter((i) => filter === 'all' || i.status === filter);

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold text-ink">Incidents</h2>
        <div className="flex gap-1.5 bg-surface p-1 rounded-xl border border-line">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg capitalize transition-colors ${
                filter === f ? 'bg-card text-ink shadow-card' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <p className="text-ink-soft text-sm mb-6">
        Full incident record. Manual creation available via /docs (Session 5) until Session 11's rule engine.
      </p>

      {error && <p className="text-danger mb-4">Couldn't load incidents. Is the backend running?</p>}
      {isLoading ? <p className="text-ink-muted">Loading…</p> : <IncidentTable incidents={incidentList} onChanged={refresh} />}
    </div>
  );
}
