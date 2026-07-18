import { useCallback } from 'react';

import { getAllIncidents, getDevices } from '../api/endpoints';
import { usePolling } from '../api/usePolling';
import StatCard from '../components/StatCard';
import IncidentsByTypeChart from '../components/charts/IncidentsByTypeChart';
import SeverityChart from '../components/charts/SeverityChart';

export default function AnalyticsPage() {
  const incidentsFetcher = useCallback(() => getAllIncidents(), []);
  const devicesFetcher = useCallback(() => getDevices(), []);

  const { data: incidents, isLoading: incidentsLoading } = usePolling(incidentsFetcher, 10000);
  const { data: devices, isLoading: devicesLoading } = usePolling(devicesFetcher, 10000);

  const incidentList = incidents || [];
  const deviceList = devices || [];
  const resolvedCount = incidentList.filter((i) => i.status === 'resolved').length;
  const avgRadius =
    incidentList.length > 0
      ? Math.round(incidentList.reduce((sum, i) => sum + i.radius_meters, 0) / incidentList.length)
      : 0;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-1">Analytics</h2>
      <p className="text-slate-500 text-sm mb-6">Aggregate view across every incident and device on record.</p>

      {incidentsLoading || devicesLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Incidents" value={incidentList.length} />
            <StatCard label="Resolved" value={resolvedCount} accent="text-green-400" />
            <StatCard label="Avg. Alert Radius" value={`${avgRadius}m`} />
            <StatCard label="Total Devices" value={deviceList.length} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Incidents by Type</h3>
              <IncidentsByTypeChart incidents={incidentList} />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Incidents by Severity</h3>
              <SeverityChart incidents={incidentList} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
