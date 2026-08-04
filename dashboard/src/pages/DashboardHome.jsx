import { useCallback } from 'react';
import { Radio, Activity, AlertTriangle, Zap } from 'lucide-react';

import { getDevices, getActiveIncidents } from '../api/endpoints';
import { usePolling } from '../api/usePolling';
import { useLiveSocket } from '../api/useLiveSocket';
import StatCard from '../components/StatCard';
import IncidentMap from '../components/IncidentMap';
import IncidentTable from '../components/IncidentTable';
import ActivityFeed from '../components/ActivityFeed';

export default function DashboardHome() {
  const devicesFetcher = useCallback(() => getDevices(), []);
  const incidentsFetcher = useCallback(() => getActiveIncidents(), []);

  const { data: devices, isLoading: devicesLoading, refresh: refreshDevices } = usePolling(devicesFetcher, 5000);
  const { data: incidents, isLoading: incidentsLoading, refresh: refreshIncidents } = usePolling(
    incidentsFetcher,
    5000
  );

  useLiveSocket((event) => {
    if (event.type === 'sensor_reading' || event.type === 'device_registered') refreshDevices();
    if (event.type === 'incident_created' || event.type === 'incident_updated') refreshIncidents();
  });

  const isLoading = devicesLoading || incidentsLoading;
  const deviceList = devices || [];
  const incidentList = incidents || [];
  const liveDevices = deviceList.filter(
    (d) => d.last_seen_at && Date.now() - new Date(d.last_seen_at).getTime() < 15000
  );

  return (
    <div className="p-8 max-w-7xl">
      <h2 className="text-2xl font-bold text-ink mb-1">Overview</h2>
      <p className="text-ink-soft text-sm mb-6">Live status across every registered sensor node and active incident.</p>

      {isLoading ? (
        <p className="text-ink-muted">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Registered Devices" value={deviceList.length} icon={Radio} tone="primary" />
            <StatCard label="Live Now" value={liveDevices.length} accent="text-success" icon={Activity} tone="success" />
            <StatCard label="Active Incidents" value={incidentList.length} accent="text-danger" icon={AlertTriangle} tone="danger" />
            <StatCard
              label="Critical"
              value={incidentList.filter((i) => i.severity === 'critical').length}
              accent="text-danger"
              icon={Zap}
              tone="danger"
            />
          </div>

          {/* Fix (3): two-column layout — map paired with a live activity
              feed, so the page reflects the actual amount of system
              activity happening instead of reading as mostly empty. */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="col-span-2">
              <IncidentMap devices={deviceList} incidents={incidentList} height="420px" />
            </div>
            <div className="col-span-1">
              <ActivityFeed />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-ink mb-3">Active Incidents</h3>
          <IncidentTable incidents={incidentList} onChanged={refreshIncidents} />
        </>
      )}
    </div>
  );
}
