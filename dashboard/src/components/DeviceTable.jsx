import { Radio } from 'lucide-react';

const LIVE_THRESHOLD_MS = 15000; // matches typical simulator publish interval (5s) with margin

function isLive(device) {
  if (!device.last_seen_at) return false;
  return Date.now() - new Date(device.last_seen_at).getTime() < LIVE_THRESHOLD_MS;
}

export default function DeviceTable({ devices }) {
  return (
    <div className="bg-card border border-line rounded-2xl overflow-hidden shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-ink-muted text-xs uppercase tracking-wide">
            <th className="text-left px-5 py-3 font-medium">Status</th>
            <th className="text-left px-5 py-3 font-medium">Device ID</th>
            <th className="text-left px-5 py-3 font-medium">Label</th>
            <th className="text-left px-5 py-3 font-medium">Location</th>
            <th className="text-left px-5 py-3 font-medium">Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => {
            const live = isLive(device);
            return (
              <tr key={device.id} className="border-b border-line last:border-0 hover:bg-surface/60 transition-colors">
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${live ? 'bg-success animate-pulse' : 'bg-line-strong'}`} />
                    <span className={live ? 'text-success font-medium' : 'text-ink-muted'}>{live ? 'Live' : 'Idle'}</span>
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-ink font-medium">{device.device_id}</td>
                <td className="px-5 py-3.5 text-ink-soft">{device.label || '—'}</td>
                <td className="px-5 py-3.5 text-ink-soft">
                  {device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}
                </td>
                <td className="px-5 py-3.5 text-ink-muted">
                  {device.last_seen_at ? new Date(device.last_seen_at).toLocaleTimeString() : 'Never'}
                </td>
              </tr>
            );
          })}
          {devices.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-16 text-center text-ink-muted">
                <Radio size={28} className="mx-auto mb-2 text-line-strong" />
                No devices registered yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
