import { EmptyHint } from './_shared';

export interface ReviewEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  actor_email: string | null;
  created_at: string;
}

const EVENT_LABELS: Record<string, { label: string; cls: string }> = {
  opened: { label: 'Ouverture', cls: 'bg-cream text-muted border-line' },
  note_saved: { label: 'Note sauvegardée', cls: 'bg-navy-50 text-navy-600 border-navy-100' },
  approved: { label: 'Approuvé', cls: 'bg-success-bg text-success border-success/40' },
  rejected: { label: 'Rejeté', cls: 'bg-danger-bg text-danger border-danger/40' },
  changes_requested: { label: 'Modifs demandées', cls: 'bg-warning-bg text-warning border-warning/40' },
  pipeline_rerun: { label: 'Pipeline relancé', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  sent_to_client: { label: 'Envoyé au client', cls: 'bg-success-bg text-success border-success/40' },
};

const dateFormatter = new Intl.DateTimeFormat('fr-CA', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function ReviewEventsTimeline({ events }: { events: ReviewEvent[] }) {
  if (events.length === 0) {
    return <EmptyHint>Aucun événement enregistré.</EmptyHint>;
  }
  return (
    <ol className="relative flex flex-col gap-3 pl-6 border-l-2 border-line">
      {events.map((ev) => {
        const entry = EVENT_LABELS[ev.event_type] ?? {
          label: ev.event_type,
          cls: 'bg-cream text-muted border-line',
        };
        const payloadKeys = ev.payload ? Object.keys(ev.payload) : [];
        return (
          <li key={ev.id} className="relative">
            <span className="absolute -left-[31px] top-1.5 inline-flex h-3 w-3 rounded-full bg-orange-500 ring-4 ring-paper" />
            <div className="rounded-lg border border-line bg-paper p-3 flex flex-col gap-1">
              <header className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${entry.cls}`}
                >
                  {entry.label}
                </span>
                <span className="font-mono text-xs text-muted">
                  {dateFormatter.format(new Date(ev.created_at))}
                </span>
                {ev.actor_email && (
                  <span className="text-xs text-muted">· {ev.actor_email}</span>
                )}
              </header>
              {payloadKeys.length > 0 && (
                <div className="text-xs text-navy-600 mt-1">
                  {payloadKeys.map((k) => {
                    const v = ev.payload![k];
                    const display =
                      typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
                        ? String(v)
                        : JSON.stringify(v);
                    return (
                      <p key={k}>
                        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted mr-1">
                          {k}
                        </span>
                        {display.length > 200 ? `${display.slice(0, 200)}…` : display}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default ReviewEventsTimeline;
