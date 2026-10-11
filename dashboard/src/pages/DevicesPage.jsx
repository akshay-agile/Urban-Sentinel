import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, Radio, Search } from 'lucide-react';

import { getDevices } from '../api/endpoints';
import { usePolling } from '../api/usePolling';
import DeviceTable from '../components/DeviceTable';
import IncidentMap from '../components/IncidentMap';

const PAGE_SIZE = 10;

export default function DevicesPage() {
  const { latestEvent, isConnected } = useOutletContext();
  const fetcher = useCallback(() => getDevices(), []);
  const { data: devices, isLoading, error, isStale, lastUpdated, refresh } = usePolling(fetcher, 15000);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [sort, setSort] = useState('label');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (latestEvent?.type === 'sensor_reading' || latestEvent?.type === 'device_registered') refresh();
  }, [latestEvent?.eventKey, latestEvent?.type, refresh]);

  const source = devices || [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return source.filter((device) => {
      const searchable = [device.device_id, device.label, device.id, device.latitude, device.longitude]
        .filter((value) => value !== null && value !== undefined).join(' ').toLowerCase();
      return (!query || searchable.includes(query))
        && (stateFilter === 'all' || (stateFilter === 'enabled' ? device.is_active : !device.is_active));
    }).sort((a, b) => {
      if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      return (a.label || a.device_id).localeCompare(b.label || b.device_id);
    });
  }, [source, search, stateFilter, sort]);

  useEffect(() => setPage(1), [search, stateFilter, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageDevices = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const enabledCount = source.filter((device) => device.is_active).length;

  return (
    <div className="max-w-7xl space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Infrastructure registry</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Devices</h1><p className="mt-2 text-sm text-ink-soft">Registered endpoints, their configured locations, and administrative state.</p></div>
        <div className="flex items-center gap-2 text-xs text-ink-muted"><span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success' : 'bg-warning'}`}/>{isConnected ? 'Live updates connected' : 'Polling for updates'}{lastUpdated && <span className="hidden sm:inline">· Updated {lastUpdated.toLocaleTimeString()}</span>}</div>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><Radio size={18}/></span><div><p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Registry snapshot</p><p className="mt-1 text-sm text-ink">{devices === null ? (error ? 'Registry counts unavailable' : 'Loading registry snapshot…') : <><strong className="tabular-nums">{source.length}</strong> returned · <strong className="tabular-nums">{enabledCount}</strong> enabled</>}</p></div></div>
        <p className="max-w-2xl text-xs leading-5 text-ink-muted">Enabled means the device is administratively active. It does not confirm connectivity. Camera frames do not update <code className="text-ink-soft">last_seen_at</code>, and the API does not provide a device type or trustworthy camera health signal.</p>
      </div>

      {isStale && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning-soft/40 px-4 py-3 text-sm"><span className="text-warning">Refresh failed. Showing the last successful device snapshot.</span><button onClick={refresh} className="font-medium text-ink underline decoration-line-strong underline-offset-4">Retry</button></div>}
      {error && devices === null ? <div className="rounded-2xl border border-danger/30 bg-card p-8 text-center"><AlertTriangle className="mx-auto text-danger"/><h2 className="mt-3 font-semibold text-ink">Device registry unavailable</h2><p className="mt-1 text-sm text-ink-muted">The device API could not be reached.</p><button onClick={refresh} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Retry</button></div> : isLoading && devices === null ? <div className="rounded-2xl border border-line bg-card p-10 text-center text-sm text-ink-muted">Loading registered devices…</div> : (
        <>
          {pageDevices.length > 0 && <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-card"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-line p-4 sm:p-5"><div><h2 className="text-sm font-semibold text-ink">Registered locations</h2><p className="mt-1 text-xs text-ink-muted">Map markers show configured coordinates only, not live device position or connectivity.</p></div><span className="text-xs text-ink-muted">{filtered.length} matching devices</span></div><div className="p-3"><IncidentMap devices={pageDevices} incidents={[]} height="320px"/></div></section>}

          <section className="space-y-3">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-sm font-semibold text-ink">Device inventory</h2><p className="mt-1 text-xs text-ink-muted">Type is not included in the current device response schema.</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><span className="sr-only">Search devices</span><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search label, ID, coordinates" className="w-full rounded-xl border border-line bg-card py-2.5 pl-9 pr-3 text-xs text-ink outline-none placeholder:text-ink-muted focus:border-primary/60 sm:w-64"/></label><select aria-label="Registration state" value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} className="rounded-xl border border-line bg-card px-3 py-2.5 text-xs text-ink outline-none"><option value="all">All registration states</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select><select aria-label="Sort devices" value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-line bg-card px-3 py-2.5 text-xs text-ink outline-none"><option value="label">Sort by label</option><option value="newest">Recently registered</option><option value="oldest">Oldest registration</option></select></div></div>
            <DeviceTable devices={pageDevices}/>
            {filtered.length > PAGE_SIZE && <nav className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3" aria-label="Device pages"><span className="text-xs text-ink-muted">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span><div className="flex gap-2"><button aria-label="Previous page" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-line p-2 text-ink-soft disabled:opacity-40">‹</button><button aria-label="Next page" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border border-line p-2 text-ink-soft disabled:opacity-40">›</button></div></nav>}
            <p className="text-[11px] text-ink-muted">The current request uses the API's default 100-row limit. Search and filters apply to this returned snapshot.</p>
          </section>
        </>
      )}
    </div>
  );
}
