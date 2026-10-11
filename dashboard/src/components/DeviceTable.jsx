import { CalendarDays, MapPin, Radio } from 'lucide-react';

function formatDate(value) {
  if (!value) return 'No timestamp recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Timestamp unavailable' : date.toLocaleString();
}

export default function DeviceTable({ devices }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card shadow-card">
      <table className="w-full min-w-[780px] text-sm">
        <thead><tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-ink-muted">
          <th className="px-4 py-3 font-semibold">Registered device</th><th className="px-4 py-3 font-semibold">Type</th><th className="px-4 py-3 font-semibold">Registration state</th><th className="px-4 py-3 font-semibold">Location</th><th className="px-4 py-3 font-semibold">Last recorded timestamp</th><th className="px-4 py-3 font-semibold">Registered</th>
        </tr></thead>
        <tbody>{devices.map((device) => (
          <tr key={device.id} className="border-b border-line last:border-0 hover:bg-surface/60">
            <td className="px-4 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-primary"><Radio size={16}/></span><span className="min-w-0"><span className="block truncate font-medium text-ink">{device.label || 'Unlabelled device'}</span><span className="mt-0.5 block font-mono text-[11px] text-ink-muted">{device.device_id} · DB #{device.id}</span></span></div></td>
            <td className="px-4 py-4 text-xs text-ink-muted">Not reported by API</td>
            <td className="px-4 py-4"><span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${device.is_active ? 'border-success/25 bg-success-soft text-success' : 'border-line bg-surface text-ink-muted'}`}><span className={`h-1.5 w-1.5 rounded-full ${device.is_active ? 'bg-success' : 'bg-ink-muted'}`}/>{device.is_active ? 'Enabled' : 'Disabled'}</span></td>
            <td className="px-4 py-4 text-xs text-ink-soft"><span className="inline-flex items-center gap-1"><MapPin size={12} className="text-ink-muted"/>{Number(device.latitude).toFixed(5)}, {Number(device.longitude).toFixed(5)}</span></td>
            <td className="max-w-[210px] px-4 py-4 text-xs text-ink-muted">{formatDate(device.last_seen_at)}</td>
            <td className="px-4 py-4 text-xs text-ink-muted"><span className="inline-flex items-center gap-1"><CalendarDays size={12}/>{formatDate(device.created_at)}</span></td>
          </tr>
        ))}</tbody>
        {devices.length === 0 && <tbody><tr><td colSpan={6} className="px-5 py-14 text-center"><Radio size={25} className="mx-auto text-ink-muted"/><p className="mt-3 text-sm font-medium text-ink">No matching devices</p><p className="mt-1 text-xs text-ink-muted">Registered devices will appear here.</p></td></tr></tbody>}
      </table>
    </div>
  );
}
