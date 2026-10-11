import type { StreamStatus } from '../api/stream';
import type { EventSummary } from '../api/types';
import { formatCount, formatLatency, formatTime } from '../lib/format';
import { StatusBadge } from './StatusBadge';
import { buttonClass } from './StatusMessage';

const FEED_ROWS = 5;

const STATUS_TEXT: Record<StreamStatus, string> = {
  connecting: 'Connecting…',
  open: 'Live',
  reconnecting: 'Reconnecting…',
};

function LiveStatus({ status }: { status: StreamStatus }) {
  const open = status === 'open';
  return (
    <p role="status" className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${open ? 'bg-ok-fg motion-safe:animate-pulse' : 'bg-blocked-fg'}`}
      />
      <span className={open ? 'text-ok-fg' : 'text-blocked-fg'}>{STATUS_TEXT[status]}</span>
    </p>
  );
}

interface LiveFeedProps {
  status: StreamStatus;
  pending: EventSummary[];
  onShowInList: () => void;
  onSelect: (id: string) => void;
}

export function LiveFeed({ status, pending, onShowInList, onSelect }: LiveFeedProps) {
  const latest = pending.slice(0, FEED_ROWS);

  return (
    <section aria-label="Live feed" className="mb-3 rounded-lg border border-line bg-subtle/60">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex items-center gap-3">
          <LiveStatus status={status} />
          <span className="text-muted">
            {pending.length === 0
              ? 'No new events yet'
              : `${formatCount(pending.length)} new ${pending.length === 1 ? 'event' : 'events'}`}
          </span>
        </div>
        <button
          type="button"
          className={`${buttonClass} py-1 text-xs`}
          disabled={pending.length === 0}
          onClick={onShowInList}
        >
          Show in list
        </button>
      </header>

      {/* fixed height, so the table below never moves */}
      <ul className="h-40 overflow-hidden">
        {latest.length === 0 && (
          <li className="flex h-full items-center justify-center text-muted">Waiting for new events…</li>
        )}
        {latest.map((event) => (
          <li key={event.id} className="motion-safe:animate-row-in">
            <button
              type="button"
              onClick={() => onSelect(event.id)}
              className="flex h-8 w-full items-center gap-3 px-3 text-left hover:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
            >
              <time dateTime={event.timestamp} className="w-16 shrink-0 text-muted tabular-nums">
                {formatTime(event.timestamp)}
              </time>
              <span className="min-w-0 flex-1 truncate">
                {event.agent} <span className="font-mono text-xs text-muted">{event.tool}</span>
              </span>
              <StatusBadge status={event.status} />
              <span className="hidden w-14 shrink-0 text-right text-muted tabular-nums sm:block">
                {formatLatency(event.latencyMs)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
