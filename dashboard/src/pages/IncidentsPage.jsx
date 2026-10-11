import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Search } from 'lucide-react';

import { getAllIncidents } from '../api/endpoints';
import { usePolling } from '../api/usePolling';
import IncidentTable from '../components/IncidentTable';
import IncidentMap from '../components/IncidentMap';
import SelectedIncidentPanel from '../components/SelectedIncidentPanel';

const PAGE_SIZE = 10;
const HAZARDS = ['fire', 'flood', 'accident'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['active', 'resolved'];

function matchesDate(value, date, end = false) {
  if (!date) return true;
  if (!value) return false;
  const [year, month, day] = date.split('-').map(Number);
  const boundary = new Date(year, month - 1, day);
  if (end) boundary.setHours(23, 59, 59, 999);
  return end ? new Date(value) <= boundary : new Date(value) >= boundary;
}

export default function IncidentsPage() {
  const { latestEvent, isConnected } = useOutletContext();
  const fetcher = useCallback(() => getAllIncidents(), []);
  const { data: incidents, isLoading, error, isStale, lastUpdated, refresh } = usePolling(fetcher, 10000);
  const [search, setSearch] = useState('');
  const [hazard, setHazard] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [resolveMessage, setResolveMessage] = useState(null);

  useEffect(() => {
    if (latestEvent?.type === 'incident_created' || latestEvent?.type === 'incident_updated') refresh();
  }, [latestEvent?.eventKey, latestEvent?.type, refresh]);

  const source = incidents || [];
  const hazardOptions = [...new Set([...HAZARDS, ...source.map((item) => item.incident_type).filter(Boolean)])];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return source.filter((item) => {
      const haystack = [item.id, item.incident_type, item.severity, item.status, item.device_id, item.latitude, item.longitude]
        .filter((value) => value !== null && value !== undefined).join(' ').toLowerCase();
      return (!query || haystack.includes(query))
        && (hazard === 'all' || item.incident_type === hazard)
        && (severity === 'all' || item.severity === severity)
        && (status === 'all' || item.status === status)
        && matchesDate(item.detected_at, fromDate)
        && matchesDate(item.detected_at, toDate, true);
    }).sort((a, b) => {
      if (sort === 'oldest') return new Date(a.detected_at) - new Date(b.detected_at);
      if (sort === 'severity') return ['critical', 'high', 'medium', 'low'].indexOf(a.severity) - ['critical', 'high', 'medium', 'low'].indexOf(b.severity);
      return new Date(b.detected_at) - new Date(a.detected_at);
    });
  }, [source, search, hazard, severity, status, fromDate, toDate, sort]);

  useEffect(() => setPage(1), [search, hazard, severity, status, fromDate, toDate, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageIncidents = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = source.find((item) => item.id === selectedId) || null;

  const clearFilters = () => {
    setSearch(''); setHazard('all'); setSeverity('all'); setStatus('all');
    setFromDate(''); setToDate(''); setSort('newest');
  };

  return (
    <div className="max-w-7xl space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Response management</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Incidents</h1>
          <p className="mt-2 text-sm text-ink-soft">Review, prioritize, and resolve recorded hazard reports.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success' : 'bg-warning'}`} />
          {isConnected ? 'Live updates connected' : 'Polling for updates'}
          {lastUpdated && <span className="hidden sm:inline">· Updated {lastUpdated.toLocaleTimeString()}</span>}
        </div>
      </header>

      {isStale && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning-soft/40 px-4 py-3 text-sm"><span className="text-warning">Refresh failed. Showing the last successful incident list.</span><button onClick={refresh} className="font-medium text-ink underline decoration-line-strong underline-offset-4">Retry</button></div>}
      {error && incidents === null ? <div className="rounded-2xl border border-danger/30 bg-card p-8 text-center"><AlertTriangle className="mx-auto text-danger"/><h2 className="mt-3 font-semibold text-ink">Incident data unavailable</h2><p className="mt-1 text-sm text-ink-muted">The incident API could not be reached.</p><button onClick={refresh} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Retry</button></div> : isLoading && incidents === null ? <div className="rounded-2xl border border-line bg-card p-10 text-center text-sm text-ink-muted">Loading incident records…</div> : (
        <>
          <section className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5" aria-label="Incident filters">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <label className="relative sm:col-span-2"><span className="sr-only">Search incidents</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ID, hazard, status, coordinates…" className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-primary/60 focus:ring-2 focus:ring-primary/15"/></label>
              <Select label="Hazard" value={hazard} onChange={setHazard} options={['all', ...hazardOptions]}/>
              <Select label="Severity" value={severity} onChange={setSeverity} options={['all', ...SEVERITIES]}/>
              <Select label="Status" value={status} onChange={setStatus} options={['all', ...STATUSES]}/>
              <Select label="Sort by" value={sort} onChange={setSort} options={['newest', 'oldest', 'severity']} labels={{ newest: 'Newest first', oldest: 'Oldest first', severity: 'Highest severity' }}/>
              <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2"><CalendarDays size={14} className="shrink-0 text-ink-muted"/><span className="sr-only">Detected from date</span><input aria-label="Detected from date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="min-w-0 w-full bg-transparent text-xs text-ink outline-none"/></label>
              <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2"><CalendarDays size={14} className="shrink-0 text-ink-muted"/><span className="sr-only">Detected to date</span><input aria-label="Detected to date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="min-w-0 w-full bg-transparent text-xs text-ink outline-none"/></label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-muted">
              <span>Filters apply to the {source.length} incident records returned by this request (API default: 100 rows).</span>
              <button type="button" onClick={clearFilters} className="font-medium text-primary hover:text-ink">Clear filters</button>
            </div>
          </section>

          {resolveMessage && <p role="status" className={`rounded-xl border px-4 py-3 text-sm ${resolveMessage.type === 'success' ? 'border-success/30 bg-success-soft text-success' : 'border-danger/30 bg-danger-soft text-danger'}`}>{resolveMessage.text}</p>}
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.8fr)]">
            <section className="min-w-0 space-y-3">
              <div className="flex items-end justify-between gap-3"><div><h2 className="text-sm font-semibold text-ink">Incident register</h2><p className="mt-1 text-xs text-ink-muted">{filtered.length} matching {filtered.length === 1 ? 'record' : 'records'} · page {page} of {pageCount}</p></div></div>
              {filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-line bg-card px-5 py-14 text-center"><AlertTriangle className="mx-auto text-ink-muted"/><p className="mt-3 text-sm font-medium text-ink">No incidents match these filters</p><button onClick={clearFilters} className="mt-2 text-xs font-semibold text-primary">Clear filters</button></div> : <IncidentTable incidents={pageIncidents} selectedId={selectedId} onSelect={setSelectedId} onChanged={refresh} onResolveResult={setResolveMessage}/>}
              {filtered.length > PAGE_SIZE && <nav className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3" aria-label="Incident pages"><span className="text-xs text-ink-muted">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span><div className="flex items-center gap-2"><button aria-label="Previous page" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-line p-2 text-ink-soft disabled:opacity-40"><ChevronLeft size={15}/></button><button aria-label="Next page" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border border-line p-2 text-ink-soft disabled:opacity-40"><ChevronRight size={15}/></button></div></nav>}
            </section>

            <aside className="space-y-4">
              <SelectedIncidentPanel incident={selected}/>
              {selected ? <section className="overflow-hidden rounded-2xl border border-line bg-card p-3 shadow-card"><div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold text-ink"><MapPin size={14} className="text-primary"/>Recorded incident location</div><IncidentMap incidents={[selected]} selectedIncidentId={selected.id} height="270px"/></section> : <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-line bg-card px-5 text-center text-sm text-ink-muted"><span><MapPin size={18} className="mx-auto mb-2"/>Select a row to inspect its recorded details and location.</span></div>}
              {selected && <div className="flex items-center gap-2 text-[11px] text-ink-muted"><Clock3 size={13}/>Detected {new Date(selected.detected_at).toLocaleString()}</div>}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function Select({ label, value, onChange, options, labels = {} }) {
  return <label className="block"><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-xs capitalize text-ink outline-none focus:border-primary/60">{options.map((option) => <option key={option} value={option}>{labels[option] || (option === 'all' ? `All ${label.toLowerCase()}s` : option.replaceAll('_', ' '))}</option>)}</select></label>;
}
