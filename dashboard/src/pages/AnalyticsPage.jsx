import { useCallback, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock3, Radio, ShieldAlert } from 'lucide-react';

import { getAllIncidents, getDevices } from '../api/endpoints';
import { usePolling } from '../api/usePolling';
import StatCard from '../components/StatCard';
import IncidentsByTypeChart from '../components/charts/IncidentsByTypeChart';
import SeverityChart from '../components/charts/SeverityChart';

function dateLabel(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

export default function AnalyticsPage() {
  const { latestEvent } = useOutletContext();
  const incidentsFetcher = useCallback(() => getAllIncidents(), []);
  const devicesFetcher = useCallback(() => getDevices(), []);
  const incidentsPoll = usePolling(incidentsFetcher, 30000);
  const devicesPoll = usePolling(devicesFetcher, 30000);
  const { data: incidents, isLoading: incidentsLoading, error: incidentsError, isStale: incidentsStale, lastUpdated: incidentsUpdated, refresh: refreshIncidents } = incidentsPoll;
  const { data: devices, isLoading: devicesLoading, error: devicesError, isStale: devicesStale, lastUpdated: devicesUpdated, refresh: refreshDevices } = devicesPoll;
  const incidentList = incidents || [];
  const deviceList = devices || [];
  const resolvedCount = incidentList.filter((incident) => incident.status === 'resolved').length;
  const activeCount = incidentList.filter((incident) => incident.status === 'active').length;
  const elevatedCount = incidentList.filter((incident) => ['high', 'critical'].includes(incident.severity)).length;
  const dateSpan = useMemo(() => {
    const dates = incidentList.map((incident) => new Date(incident.detected_at)).filter((date) => !Number.isNaN(date.getTime())).sort((a, b) => a - b);
    if (!dates.length) return null;
    return { start: dates[0], end: dates[dates.length - 1] };
  }, [incidentList]);
  const latestUpdated = [incidentsUpdated, devicesUpdated].filter(Boolean).sort((a, b) => b - a)[0];
  const unavailable = (incidentsError && incidents === null) || (devicesError && devices === null);

  useEffect(() => {
    if (latestEvent?.type === 'incident_created' || latestEvent?.type === 'incident_updated') refreshIncidents();
    if (latestEvent?.type === 'device_registered' || latestEvent?.type === 'sensor_reading') refreshDevices();
  }, [latestEvent?.eventKey, latestEvent?.type, refreshIncidents, refreshDevices]);

  return (
    <div className="max-w-7xl space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Operational analysis</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Analytics</h1><p className="mt-2 text-sm text-ink-soft">Descriptive breakdown of incident and device records returned by the current APIs.</p></div>
        {latestUpdated && <p className="flex items-center gap-1.5 text-xs text-ink-muted"><Clock3 size={13}/>Data refreshed {latestUpdated.toLocaleTimeString()}</p>}
      </header>

      <section className="rounded-2xl border border-warning/25 bg-warning-soft/30 p-4 sm:p-5">
        <div className="flex items-start gap-3"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-warning"/><div><h2 className="text-sm font-semibold text-ink">Sample scope and limits</h2><p className="mt-1 text-xs leading-5 text-ink-soft">{unavailable ? 'One or more APIs could not be reached. Sample metrics are unavailable; a failed request is not treated as an empty result.' : incidentsLoading || devicesLoading ? 'Waiting for the incident and device APIs. Sample metrics will appear after both requests complete.' : <>The incident endpoint returns at most 100 rows per request and provides no aggregate totals or date-range query. All incident counts and charts below describe only the {incidentList.length} rows currently returned; they are not historical totals. {dateSpan ? `Detected-date span in this sample: ${dateLabel(dateSpan.start)}–${dateLabel(dateSpan.end)}.` : 'No detected-date span is available.'}</>}</p></div></div>
      </section>

      {(incidentsStale || devicesStale) && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning-soft/40 px-4 py-3 text-sm"><span className="text-warning">A refresh failed. Previously loaded values remain visible.</span><div className="flex gap-3"><button onClick={refreshIncidents} className="font-medium text-ink underline decoration-line-strong underline-offset-4">Retry incidents</button><button onClick={refreshDevices} className="font-medium text-ink underline decoration-line-strong underline-offset-4">Retry devices</button></div></div>}
      {unavailable ? <div className="rounded-2xl border border-danger/30 bg-card p-8 text-center"><AlertTriangle className="mx-auto text-danger"/><h2 className="mt-3 font-semibold text-ink">Analytics data unavailable</h2><p className="mt-1 text-sm text-ink-muted">Could not load {incidentsError && incidents === null && devicesError && devices === null ? 'incident and device records' : incidentsError && incidents === null ? 'incident records' : 'device records'}.</p><button onClick={() => { refreshIncidents(); refreshDevices(); }} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Retry</button></div> : incidentsLoading || devicesLoading ? <div className="rounded-2xl border border-line bg-card p-10 text-center text-sm text-ink-muted">Loading analytics sample…</div> : (
        <>
          <section aria-label="Sample metrics"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Current API sample</h2><p className="text-xs text-ink-muted">{incidentList.length} incidents · {deviceList.length} devices returned</p></div><div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Incident records in sample" value={incidentList.length} icon={AlertTriangle} tone="primary"/>
            <StatCard label="Active in sample" value={activeCount} accent="text-danger" icon={ShieldAlert} tone="danger"/>
            <StatCard label="Resolved in sample" value={resolvedCount} accent="text-success" icon={CheckCircle2} tone="success"/>
            <StatCard label="High / critical in sample" value={elevatedCount} accent="text-severity-critical" icon={Radio} tone="primary"/>
          </div></section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article className="min-w-0 rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5"><div className="mb-4"><h2 className="text-sm font-semibold text-ink">Incident mix by hazard</h2><p className="mt-1 text-xs text-ink-muted">Count of returned incident rows by recorded type</p></div><div className="relative h-[280px] sm:h-[320px]"><IncidentsByTypeChart incidents={incidentList}/></div></article>
            <article className="min-w-0 rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5"><div className="mb-4"><h2 className="text-sm font-semibold text-ink">Severity distribution</h2><p className="mt-1 text-xs text-ink-muted">Count of returned incident rows by recorded severity</p></div><div className="relative mx-auto h-[280px] max-w-[440px] sm:h-[320px]"><SeverityChart incidents={incidentList}/></div></article>
          </section>
          <p className="text-[11px] leading-5 text-ink-muted">Response-time metrics are not shown: although detected and resolved timestamps exist in the response schema, the current dashboard resolution request only changes status and does not reliably populate <code className="text-ink-soft">resolved_at</code>. Device count is also limited to the API’s returned device rows (up to 100).</p>
        </>
      )}
    </div>
  );
}
