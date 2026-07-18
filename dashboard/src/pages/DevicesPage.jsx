import { useCallback } from 'react';

import { getDevices } from '../api/endpoints';
import { usePolling } from '../api/usePolling';
import DeviceTable from '../components/DeviceTable';
import IncidentMap from '../components/IncidentMap';

export default function DevicesPage() {
  const fetcher = useCallback(() => getDevices(), []);
  const { data: devices, isLoading, error } = usePolling(fetcher, 5000);
  const deviceList = devices || [];

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-1">Devices</h2>
      <p className="text-slate-500 text-sm mb-6">
        Every registered sensor node. "Live" means a reading was received in the last 15 seconds.
      </p>

      {error && <p className="text-red-400 mb-4">Couldn't load devices. Is the backend running?</p>}
      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="mb-6">
            <IncidentMap devices={deviceList} incidents={[]} height="360px" />
          </div>
          <DeviceTable devices={deviceList} />
        </>
      )}
    </div>
  );
}
