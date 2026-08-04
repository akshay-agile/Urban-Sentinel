import { useState } from 'react';
import { Radio, AlertTriangle, CheckCircle2, TrendingUp, Bell } from 'lucide-react';

import { useLiveSocket } from '../api/useLiveSocket';

const MAX_ITEMS = 20;

// Deliberately excludes sensor_reading (fires every ~5s per device — far
// too noisy for a readable feed) and per-user notification_created
// (one event per matched recipient would spam the feed for a single
// incident). Only meaningful state changes are shown.
function describeEvent(event) {
  switch (event.type) {
    case 'device_registered':
      return { icon: Radio, tone: 'text-primary bg-primary-soft', text: `New device registered — ${event.device_id}` };
    case 'incident_created':
      return {
        icon: AlertTriangle,
        tone: 'text-danger bg-danger-soft',
        text: `${event.incident_type.replace('_', ' ')} incident detected — ${event.severity} severity`,
      };
    case 'incident_updated':
      if (event.status === 'resolved') {
        return { icon: CheckCircle2, tone: 'text-success bg-success-soft', text: `Incident #${event.id} resolved` };
      }
      return {
        icon: TrendingUp,
        tone: 'text-warning bg-warning-soft',
        text: `Incident #${event.id} escalated to ${event.severity} severity`,
      };
    default:
      return null;
  }
}

export default function ActivityFeed() {
  const [items, setItems] = useState([]);

  useLiveSocket((event) => {
    const described = describeEvent(event);
    if (!described) return;
    setItems((prev) => [{ ...described, id: `${event.type}-${Date.now()}-${Math.random()}`, at: new Date() }, ...prev].slice(0, MAX_ITEMS));
  });

  return (
    <div className="bg-card border border-line rounded-2xl p-5 shadow-card h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Bell size={16} className="text-ink-soft" />
        <h3 className="text-sm font-semibold text-ink">Live Activity</h3>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <p className="text-sm text-ink-muted">
            Events will appear here as they happen — device registrations, new incidents, and resolutions.
          </p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto flex-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.tone}`}>
                  <Icon size={13} strokeWidth={2.3} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-ink leading-snug capitalize">{item.text}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{item.at.toLocaleTimeString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
