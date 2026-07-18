const LIVE_THRESHOLD_MS = 15000; // matches typical simulator publish interval (5s) with margin

function isLive(device) {
  if (!device.last_seen_at) return false;
  return Date.now() - new Date(device.last_seen_at).getTime() < LIVE_THRESHOLD_MS;
}

export default function DeviceTable({ devices }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-slate-500 text-xs uppercase">
          <tr className="border-b border-slate-800">
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Device ID</th>
            <th className="text-left px-4 py-3">Label</th>
            <th className="text-left px-4 py-3">Location</th>
            <th className="text-left px-4 py-3">Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => {
            const live = isLive(device);
            return (
              <tr key={device.id} className="border-b border-slate-800 last:border-0">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}
                    />
                    <span className={live ? 'text-green-400' : 'text-slate-500'}>{live ? 'Live' : 'Idle'}</span>
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-slate-200">{device.device_id}</td>
                <td className="px-4 py-3 text-slate-400">{device.label || '—'}</td>
                <td className="px-4 py-3 text-slate-400">
                  {device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {device.last_seen_at ? new Date(device.last_seen_at).toLocaleTimeString() : 'Never'}
                </td>
              </tr>
            );
          })}
          {devices.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                No devices registered yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
