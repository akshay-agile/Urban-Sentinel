import { useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Target, Radio } from 'lucide-react';

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
    <div className="p-8 max-w-7xl">
      <h2 className="text-2xl font-bold text-ink mb-1">Analytics</h2>
      <p className="text-ink-soft text-sm mb-6">Aggregate view across every incident and device on record.</p>

      {incidentsLoading || devicesLoading ? (
        <p className="text-ink-muted">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Incidents" value={incidentList.length} icon={AlertTriangle} tone="primary" />
            <StatCard label="Resolved" value={resolvedCount} accent="text-success" icon={CheckCircle2} tone="success" />
            <StatCard label="Avg. Alert Radius" value={`${avgRadius}m`} icon={Target} tone="primary" />
            <StatCard label="Total Devices" value={deviceList.length} icon={Radio} tone="primary" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-card border border-line rounded-2xl p-6 shadow-card">
              <h3 className="text-sm font-semibold text-ink mb-4">Incidents by Type</h3>
              <IncidentsByTypeChart incidents={incidentList} />
            </div>
            <div className="bg-card border border-line rounded-2xl p-6 shadow-card">
              <h3 className="text-sm font-semibold text-ink mb-4">Incidents by Severity</h3>
              <SeverityChart incidents={incidentList} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
