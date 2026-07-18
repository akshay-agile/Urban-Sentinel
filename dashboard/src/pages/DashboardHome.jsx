import { useCallback } from 'react';

import { getDevices, getActiveIncidents } from '../api/endpoints';
import { usePolling } from '../api/usePolling';
import StatCard from '../components/StatCard';
import IncidentMap from '../components/IncidentMap';
import IncidentTable from '../components/IncidentTable';

export default function DashboardHome() {
  const devicesFetcher = useCallback(() => getDevices(), []);
  const incidentsFetcher = useCallback(() => getActiveIncidents(), []);

  const { data: devices, isLoading: devicesLoading } = usePolling(devicesFetcher, 5000);
  const { data: incidents, isLoading: incidentsLoading, refresh } = usePolling(incidentsFetcher, 5000);

  const isLoading = devicesLoading || incidentsLoading;
  const deviceList = devices || [];
  const incidentList = incidents || [];
  const liveDevices = deviceList.filter(
    (d) => d.last_seen_at && Date.now() - new Date(d.last_seen_at).getTime() < 15000
  );

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-1">Overview</h2>
      <p className="text-slate-500 text-sm mb-6">Live status across every registered sensor node and active incident.</p>

      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Registered Devices" value={deviceList.length} />
            <StatCard label="Live Now" value={liveDevices.length} accent="text-green-400" />
            <StatCard label="Active Incidents" value={incidentList.length} accent="text-red-400" />
            <StatCard
              label="Critical"
              value={incidentList.filter((i) => i.severity === 'critical').length}
              accent="text-red-500"
            />
          </div>

          <div className="mb-6">
            <IncidentMap devices={deviceList} incidents={incidentList} height="420px" />
          </div>

          <h3 className="text-lg font-semibold mb-3">Active Incidents</h3>
          <IncidentTable incidents={incidentList} onChanged={refresh} />
        </>
      )}
    </div>
  );
}
