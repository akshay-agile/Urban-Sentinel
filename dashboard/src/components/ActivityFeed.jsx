import { AlertTriangle, CheckCircle2, Radio, TrendingUp } from 'lucide-react';

const MAX_ITEMS = 6;

function describeEvent(event) {
  switch (event.type) {
    case 'device_registered':
      return {
        icon: Radio,
        tone: 'text-primary bg-primary-soft',
        text: `Device registered · ${event.device_id}`,
      };
    case 'incident_created':
      return {
        icon: AlertTriangle,
        tone: 'text-danger bg-danger-soft',
        text: `${event.incident_type?.replaceAll('_', ' ') || 'Incident'} detected · ${event.severity || 'severity unavailable'}`,
      };
    case 'incident_updated':
      if (event.status === 'resolved') {
        return {
          icon: CheckCircle2,
          tone: 'text-success bg-success-soft',
          text: `Incident #${event.id} resolved`,
        };
      }
      return {
        icon: TrendingUp,
        tone: 'text-warning bg-warning-soft',
        text: event.severity
          ? `Incident #${event.id} updated · ${event.severity} severity`
          : `Incident #${event.id} updated`,
      };
    default:
      return null;
  }
}

export default function ActivityFeed({ events = [] }) {
  const items = events
    .map((event) => ({ ...event, description: describeEvent(event) }))
    .filter((event) => event.description)
    .slice(0, MAX_ITEMS);

  return (
    <section className="flex h-full min-h-[250px] flex-col rounded-2xl border border-line bg-card p-5 shadow-card" aria-labelledby="activity-title">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 id="activity-title" className="text-sm font-semibold text-ink">Live activity</h2>
          <p className="mt-1 text-xs text-ink-muted">Events received during this session</p>
        </div>
        <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
          WebSocket
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line px-5 py-8 text-center">
          <p className="max-w-[220px] text-sm leading-6 text-ink-muted">
            No incident or device events have arrived since this dashboard session began.
          </p>
        </div>
      ) : (
        <ol className="space-y-4 overflow-y-auto" aria-live="polite">
          {items.map((event) => {
            const Icon = event.description.icon;
            return (
              <li key={event.eventKey} className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${event.description.tone}`}>
                  <Icon size={15} strokeWidth={2.1} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-5 text-ink">{event.description.text}</span>
                  <time className="mt-1 block text-xs text-ink-muted" dateTime={new Date(event.receivedAt).toISOString()}>
                    {new Date(event.receivedAt).toLocaleTimeString()}
                  </time>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
