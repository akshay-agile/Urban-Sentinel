import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, AlertTriangle, CarFront, Circle, Clock3, Download, Droplets, Flame, MapPin, Maximize2, Minimize2, Radio, RefreshCw } from 'lucide-react';

import { getActiveIncidents } from '../api/endpoints';
import { usePolling } from '../api/usePolling';
import ActivityFeed from '../components/ActivityFeed';
import ActiveIncidentQueue from '../components/ActiveIncidentQueue';
import IncidentMap from '../components/IncidentMap';
import QuickActions from '../components/QuickActions';
import { INCIDENT_TYPE_COLORS, SEVERITY_COLORS } from '../theme';

const PRIORITY = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];
const FILTERS = [
  { id: 'all', label: 'All incidents', icon: AlertTriangle },
  { id: 'fire', label: 'Fire', icon: Flame },
  { id: 'flood', label: 'Flood', icon: Droplets },
  { id: 'accident', label: 'Road accident', icon: CarFront },
  { id: 'other', label: 'Other', icon: Radio },
];

function isPrimaryHazard(type) {
  return ['fire', 'smoke', 'flood', 'accident'].includes(type);
}

function matchesHazard(incident, type) {
  return incident.incident_type === type || (type === 'fire' && incident.incident_type === 'smoke');
}

function sortByPriority(incidents) {
  return [...incidents].sort((left, right) => {
    const severityDifference = (PRIORITY[left.severity] ?? 4) - (PRIORITY[right.severity] ?? 4);
    if (severityDifference !== 0) return severityDifference;
    const timeDifference = new Date(right.detected_at).getTime() - new Date(left.detected_at).getTime();
    return (Number.isNaN(timeDifference) ? 0 : timeDifference) || right.id - left.id;
  });
}

function MetricCard({ label, value, note, icon: Icon, color, wash = label === 'Flood alerts' ? '#E7F4FF' : label === 'Road accidents' ? '#FFF2DF' : '#FFF0ED' }) {
  return (
    <article className="relative overflow-hidden rounded-[14px] border border-line bg-card p-[14px_15px] shadow-card">
      <span aria-hidden="true" className="pointer-events-none absolute -right-[17px] -top-[18px] h-[70px] w-[70px] rounded-full" style={{ backgroundColor: wash }} />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-ink-muted">{label}</p>
          <p className="mt-1.5 text-[28px] font-black leading-[34px] tracking-tight tabular-nums text-ink">{value}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon size={17} strokeWidth={2} />
        </span>
      </div>
      <p className="relative z-10 mt-1 text-[10px] text-ink-muted">{note}</p>
    </article>
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
  const [isMapExpanded, setIsMapExpanded] = useState(false);
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
    return prioritized.filter((incident) => matchesHazard(incident, hazardFilter));
  }, [hazardFilter, prioritized]);

  useEffect(() => {
    if (!visibleIncidents.some((incident) => incident.id === selectedIncidentId)) {
      setSelectedIncidentId(visibleIncidents[0]?.id ?? null);
    }
  }, [selectedIncidentId, visibleIncidents]);

  const countType = (type) => incidentList.filter((incident) => matchesHazard(incident, type)).length;
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
  const emptyQueueMessage = incidents === null
    ? 'Waiting for incident data'
    : hazardFilter === 'all'
      ? 'No active incidents'
      : `No active ${FILTERS.find((filter) => filter.id === hazardFilter)?.label || 'hazard'} reports`;

  const apiHealthy = incidents !== null && error === null;
  const updatedLabel = lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Waiting for first API response';
  const highPriorityNote = incidents === null
    ? 'Waiting for API data'
    : <><b className="font-semibold text-danger">{severityCounts.high + severityCounts.critical} high priority</b> · needs attention</>;

  const exportSummary = () => {
    if (!Array.isArray(incidents)) return;
    const fields = ['id', 'incident_type', 'severity', 'status', 'latitude', 'longitude', 'radius_meters', 'detected_at'];
    const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [fields.join(','), ...incidentList.map((incident) => fields.map((field) => escapeCsv(incident[field])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'urban-sentinel-active-incidents.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div>
      <header className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold tracking-tight text-ink">City safety overview</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-soft">
            A clear view of active incidents, their locations, and the next actions for operators.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <button type="button" onClick={exportSummary} disabled={!Array.isArray(incidents)} className="inline-flex items-center gap-2 rounded-[9px] border border-line bg-white px-3 py-2 text-[11px] font-extrabold text-ink-soft shadow-card hover:border-primary/35 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">
            <Download size={14}/> Export summary
          </button>
          <span className={`inline-flex items-center gap-1.5 px-1 text-[10px] font-bold ${isStale ? 'text-warning' : apiHealthy ? 'text-success' : 'text-ink-muted'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isStale ? 'bg-warning' : apiHealthy ? 'bg-success' : 'bg-ink-muted'}`} />
            {isStale ? 'API stale' : apiHealthy ? 'API data available' : error ? 'API unavailable' : 'Waiting for API'}
          </span>
          <button type="button" onClick={refresh} className="inline-flex items-center gap-2 rounded-[9px] border border-primary bg-primary px-3 py-2 text-[11px] font-extrabold text-white shadow-card hover:bg-primary-dark" aria-label="Refresh incident data">
            <RefreshCw size={14}/> Refresh overview
          </button>
        </div>
      </header>

      <>
          {isLoading && incidents === null ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-[11px] text-ink-muted" role="status">
              <RefreshCw size={13} className="animate-spin text-primary" /> Loading incident data from the API…
            </div>
          ) : null}
          {error && incidents === null ? <ApiErrorPanel onRetry={refresh} /> : null}
          {isStale ? (
            <div className="mb-4 flex flex-col justify-between gap-2 rounded-xl border border-warning/30 bg-warning-soft/50 px-4 py-3 text-sm sm:flex-row sm:items-center">
              <p className="text-warning">Refresh failed. Displaying the last successful active-incident snapshot.</p>
              <p className="text-xs text-ink-muted">{updatedLabel}</p>
            </div>
          ) : null}

          <section aria-label="Active incident metrics" className="mb-[17px]">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <MetricCard label="Active incidents" value={incidents === null ? '—' : incidentList.length} note={highPriorityNote} icon={Activity} color="bg-danger-soft text-danger" />
              <MetricCard label="Fire alerts" value={incidents === null ? '—' : countType('fire')} note="Detection category" icon={Flame} color="bg-[#FCEBED] text-hazard-fire" />
              <MetricCard label="Flood alerts" value={incidents === null ? '—' : countType('flood')} note="Water / inundation" icon={Droplets} color="bg-info-soft text-hazard-flood" />
              <MetricCard label="Road accidents" value={incidents === null ? '—' : countType('accident')} note="Traffic incidents" icon={CarFront} color="bg-[#FFF0DF] text-hazard-accident" />
            </div>
            <div className="sr-only">
              <span className="inline-flex items-center gap-1.5"><Clock3 size={12} />{updatedLabel}</span>
              <span className="inline-flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${isStale ? 'bg-warning' : apiHealthy ? 'bg-success' : 'bg-danger'}`} />
                {isStale ? 'API stale · showing saved snapshot' : apiHealthy ? 'API data available' : error ? 'API unavailable' : 'Waiting for API'}
              </span>
            </div>
          </section>

          <section className="grid min-w-0 items-start gap-[15px] xl:grid-cols-[minmax(0,1.65fr)_minmax(285px,0.8fr)]" id="incident-map">
            <div className="min-w-0 overflow-hidden rounded-[15px] border border-line bg-card shadow-card">
              <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-[14px]">
                <div>
                  <h2 className="text-[13px] font-extrabold tracking-tight text-ink">Incident map</h2>
                  <p className="mt-1 text-[10px] text-ink-muted">Where events are happening across the monitored area.</p>
                </div>
                <button type="button" onClick={() => setIsMapExpanded((current) => !current)} className="inline-flex shrink-0 items-center gap-1.5 rounded-[9px] border border-line bg-white px-2.5 py-2 text-[10px] font-extrabold text-ink-soft hover:border-primary/35 hover:text-primary" aria-pressed={isMapExpanded}>
                  {isMapExpanded ? <Minimize2 size={13}/> : <Maximize2 size={13}/>}{isMapExpanded ? 'Restore map' : 'Expand map'}
                </button>
              </header>
              <div className="flex flex-wrap gap-1.5 px-3.5 pt-2.5" role="group" aria-label="Filter map and queue by hazard">
                {FILTERS.map(({ id, label, icon: Icon }) => {
                  const active = hazardFilter === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setHazardFilter(id)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? 'border-primary/30 bg-primary-soft text-primary' : 'border-line bg-white text-ink-soft hover:border-line-strong hover:text-ink'}`}
                    >
                      <Icon size={12} /> {label} <span className="font-mono text-[9px] opacity-70">{filterCounts[id]}</span>
                    </button>
                  );
                })}
              </div>
              <div className="relative mx-[13px] mb-[13px] mt-[11px] h-[300px] overflow-hidden rounded-xl sm:h-[365px]" style={isMapExpanded ? { height: 'min(700px, calc(100vh - 230px))' } : undefined}>
                <IncidentMap
                  incidents={visibleIncidents}
                  height="100%"
                  selectedIncidentId={selectedIncidentId}
                  onIncidentSelect={setSelectedIncidentId}
                />
                {incidents === null || visibleIncidents.length === 0 ? (
                  <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex items-center gap-2 rounded-lg border border-line bg-white/95 px-3 py-2 shadow-card">
                    <MapPin size={14} className="shrink-0 text-ink-muted" />
                    <span className="text-[10px] font-medium text-ink-soft">{incidents === null ? 'Waiting for active incident data' : 'No active incidents to plot'}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-3 text-[10px] text-ink-muted">
                <span className="font-extrabold uppercase tracking-wider">Map key</span>
                {FILTERS.filter((item) => ['fire', 'flood', 'accident'].includes(item.id)).map((item) => (
                  <span key={item.id} className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INCIDENT_TYPE_COLORS[item.id] }} />
                    {item.label}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5"><Circle size={10} className="text-severity-critical" /> Severity radius</span>
              </div>
            </div>

            <ActiveIncidentQueue
              incidents={visibleIncidents}
              selectedIncidentId={selectedIncidentId}
              onSelect={setSelectedIncidentId}
              onResolved={() => {
                if (!isConnected) refresh();
              }}
              emptyMessage={emptyQueueMessage}
              emptyHint={incidents === null ? 'The queue will update when the API responds.' : hazardFilter === 'all' ? 'New active reports will appear here.' : 'Choose another hazard filter to review other active reports.'}
            />
          </section>

          <section className="mt-[15px] grid items-start gap-[15px] lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
            <ActivityFeed events={liveEvents} isConnected={isConnected} />
            <QuickActions />
          </section>
        </>
    </div>
  );
}
