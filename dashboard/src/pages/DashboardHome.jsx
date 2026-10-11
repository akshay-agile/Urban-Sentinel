import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, AlertTriangle, CarFront, Circle, Clock3, Droplets, Flame, MapPin, Radio, RefreshCw } from 'lucide-react';

import { getActiveIncidents } from '../api/endpoints';
import { usePolling } from '../api/usePolling';
import ActivityFeed from '../components/ActivityFeed';
import ActiveIncidentQueue from '../components/ActiveIncidentQueue';
import IncidentMap from '../components/IncidentMap';
import SelectedIncidentPanel from '../components/SelectedIncidentPanel';
import { INCIDENT_TYPE_COLORS, SEVERITY_COLORS } from '../theme';

const PRIORITY = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];
const FILTERS = [
  { id: 'all', label: 'All hazards', icon: AlertTriangle },
  { id: 'fire', label: 'Fire / smoke', icon: Flame },
  { id: 'flood', label: 'Flood', icon: Droplets },
  { id: 'accident', label: 'Accident', icon: CarFront },
  { id: 'other', label: 'Other', icon: Radio },
];

function isPrimaryHazard(type) {
  return ['fire', 'flood', 'accident'].includes(type);
}

function sortByPriority(incidents) {
  return [...incidents].sort((left, right) => {
    const severityDifference = (PRIORITY[left.severity] ?? 4) - (PRIORITY[right.severity] ?? 4);
    if (severityDifference !== 0) return severityDifference;
    const timeDifference = new Date(right.detected_at).getTime() - new Date(left.detected_at).getTime();
    return (Number.isNaN(timeDifference) ? 0 : timeDifference) || right.id - left.id;
  });
}

function MetricCard({ label, value, note, icon: Icon, color }) {
  return (
    <article className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted sm:text-[11px]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-ink sm:text-3xl">{value}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon size={17} strokeWidth={2} />
        </span>
      </div>
      <p className="mt-3 border-t border-line pt-3 text-xs text-ink-muted">{note}</p>
    </article>
  );
}

function ConnectionPill({ healthy, children, warning = false }) {
  const tone = warning ? 'border-warning/30 bg-warning-soft text-warning' : healthy
    ? 'border-success/25 bg-success-soft text-success'
    : 'border-line bg-panel text-ink-muted';
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${warning ? 'bg-warning' : healthy ? 'bg-success' : 'bg-ink-muted'}`} />
      {children}
    </span>
  );
}

function LoadingPanel() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.85fr)]" aria-label="Loading active incidents">
      <div className="h-[460px] animate-pulse rounded-2xl border border-line bg-card" />
      <div className="h-[460px] animate-pulse rounded-2xl border border-line bg-card" />
    </div>
  );
}

function ApiErrorPanel({ onRetry }) {
  return (
    <section className="rounded-2xl border border-danger/30 bg-card p-8 text-center shadow-card" role="alert">
      <AlertTriangle size={24} className="mx-auto text-danger" />
      <h2 className="mt-3 text-base font-semibold text-ink">Incident data unavailable</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
        The active-incidents API could not be reached. No incident counts or map data are being shown as current.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm font-medium text-ink transition hover:border-primary/50 hover:text-primary"
      >
        <RefreshCw size={15} /> Retry
      </button>
    </section>
  );
}

export default function DashboardHome() {
  const { isConnected, liveEvents, latestEvent } = useOutletContext();
  const [hazardFilter, setHazardFilter] = useState('all');
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const fetcher = useCallback(() => getActiveIncidents(), []);
  const {
    data: incidents,
    error,
    isLoading,
    isStale,
    lastUpdated,
    refresh,
  } = usePolling(fetcher, 15000);

  useEffect(() => {
    if (latestEvent?.type === 'incident_created' || latestEvent?.type === 'incident_updated') refresh();
  }, [latestEvent?.eventKey, latestEvent?.type, refresh]);

  const incidentList = Array.isArray(incidents) ? incidents : [];
  const prioritized = useMemo(() => sortByPriority(incidentList), [incidentList]);
  const visibleIncidents = useMemo(() => {
    if (hazardFilter === 'all') return prioritized;
    if (hazardFilter === 'other') return prioritized.filter((incident) => !isPrimaryHazard(incident.incident_type));
    return prioritized.filter((incident) => incident.incident_type === hazardFilter);
  }, [hazardFilter, prioritized]);

  useEffect(() => {
    if (!visibleIncidents.some((incident) => incident.id === selectedIncidentId)) {
      setSelectedIncidentId(visibleIncidents[0]?.id ?? null);
    }
  }, [selectedIncidentId, visibleIncidents]);

  const selectedIncident = visibleIncidents.find((incident) => incident.id === selectedIncidentId) || null;
  const countType = (type) => incidentList.filter((incident) => incident.incident_type === type).length;
  const severityCounts = Object.fromEntries(
    SEVERITY_ORDER.map((severity) => [severity, incidentList.filter((incident) => incident.severity === severity).length])
  );

  const filterCounts = {
    all: incidentList.length,
    fire: countType('fire'),
    flood: countType('flood'),
    accident: countType('accident'),
    other: incidentList.filter((incident) => !isPrimaryHazard(incident.incident_type)).length,
  };
  const emptyQueueMessage = hazardFilter === 'all'
    ? 'No active incidents'
    : `No active ${FILTERS.find((filter) => filter.id === hazardFilter)?.label || 'hazard'} reports`;

  const apiHealthy = incidents !== null && error === null;
  const updatedLabel = lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Waiting for first API response';

  return (
    <div className="max-w-[1520px] space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Emergency operations</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Command center</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            Live active reports for fire, flooding, accidents, and other hazards.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <ConnectionPill healthy={apiHealthy} warning={isStale}>
            {isStale ? 'API stale · cached snapshot' : apiHealthy ? 'API connected' : error ? 'API unavailable' : 'Connecting to API'}
          </ConnectionPill>
          <ConnectionPill healthy={isConnected}>{isConnected ? 'Live feed connected' : 'Polling fallback'}</ConnectionPill>
        </div>
      </header>

      {isLoading && incidents === null ? (
        <LoadingPanel />
      ) : error && incidents === null ? (
        <ApiErrorPanel onRetry={refresh} />
      ) : (
        <>
          {isStale ? (
            <div className="flex flex-col justify-between gap-2 rounded-xl border border-warning/30 bg-warning-soft/50 px-4 py-3 text-sm sm:flex-row sm:items-center">
              <p className="text-warning">Refresh failed. Displaying the last successful active-incident snapshot.</p>
              <p className="text-xs text-ink-muted">{updatedLabel}</p>
            </div>
          ) : null}

          <section aria-label="Active incident metrics">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Operational summary</h2>
              <p className="flex items-center gap-1.5 text-xs text-ink-muted"><Clock3 size={13} />{updatedLabel}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
              <MetricCard label="Active incidents" value={incidentList.length} note="Current active API records" icon={Activity} color="bg-danger-soft text-danger" />
              <MetricCard label="Critical" value={severityCounts.critical} note="Active reports" icon={AlertTriangle} color="bg-danger-soft text-severity-critical" />
              <MetricCard label="Fire / smoke" value={countType('fire')} note="Active reports" icon={Flame} color="bg-[#3A251F] text-hazard-fire" />
              <MetricCard label="Flood" value={countType('flood')} note="Active reports" icon={Droplets} color="bg-info-soft text-hazard-flood" />
              <MetricCard label="Accidents" value={countType('accident')} note="Active reports" icon={CarFront} color="bg-[#28243D] text-hazard-accident" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-4 py-3">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Severity</span>
              {SEVERITY_ORDER.map((severity) => (
                <span key={severity} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs capitalize text-ink-soft">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[severity] }} />
                  {severity} <strong className="font-semibold tabular-nums text-ink">{severityCounts[severity]}</strong>
                </span>
              ))}
            </div>
          </section>

          <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.85fr)]">
            <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-card shadow-card">
              <div className="flex flex-col gap-4 border-b border-line px-4 py-4 sm:px-5">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Incident map</h2>
                  <p className="mt-1 text-xs text-ink-muted">Select a marker or queue item to focus its recorded location.</p>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter map and queue by hazard">
                  {FILTERS.map(({ id, label, icon: Icon }) => {
                    const active = hazardFilter === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setHazardFilter(id)}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? 'border-primary/40 bg-primary-soft text-primary' : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink'}`}
                      >
                        <Icon size={13} /> {label} <span className="font-mono text-[10px] opacity-70">{filterCounts[id]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {visibleIncidents.length > 0 ? (
                <>
                  <div className="h-[360px] sm:h-[460px]">
                    <IncidentMap
                      incidents={visibleIncidents}
                      height="100%"
                      selectedIncidentId={selectedIncidentId}
                      onIncidentSelect={setSelectedIncidentId}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-3 text-[10px] text-ink-muted sm:px-5">
                    <span className="font-semibold uppercase tracking-wider">Map key</span>
                    {FILTERS.filter((item) => ['fire', 'flood', 'accident'].includes(item.id)).map((item) => (
                      <span key={item.id} className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INCIDENT_TYPE_COLORS[item.id] }} />
                        {item.label}
                      </span>
                    ))}
                    <span className="inline-flex items-center gap-1.5">
                      <Circle size={11} className="text-severity-critical" /> Radius ring color indicates severity
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex h-[360px] flex-col items-center justify-center px-6 text-center sm:h-[460px]">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface text-ink-muted">
                    <MapPin size={20} />
                  </span>
                  <p className="mt-4 text-sm font-medium text-ink">No active incidents to plot</p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-ink-muted">The map will show recorded coordinates when an active incident matches this filter.</p>
                </div>
              )}
            </div>

            <ActiveIncidentQueue
              incidents={visibleIncidents}
              selectedIncidentId={selectedIncidentId}
              onSelect={setSelectedIncidentId}
              onResolved={() => {
                if (!isConnected) refresh();
              }}
              emptyMessage={emptyQueueMessage}
              emptyHint={hazardFilter === 'all' ? 'New active reports will appear here.' : 'Choose another hazard filter to review other active reports.'}
            />
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <SelectedIncidentPanel incident={selectedIncident} />
            <ActivityFeed events={liveEvents} />
          </section>
        </>
      )}
    </div>
  );
}
