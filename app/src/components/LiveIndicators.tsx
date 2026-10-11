import type { StreamStatus } from '../api/stream';
import { formatCount } from '../lib/format';

const STATUS_TEXT: Record<StreamStatus, string> = {
  connecting: 'Connecting…',
  open: 'Live',
  reconnecting: 'Reconnecting…',
};

export function LiveStatus({ status }: { status: StreamStatus }) {
  const open = status === 'open';
  return (
    <p role="status" className="flex items-center gap-1.5 text-xs font-medium text-muted">
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${open ? 'bg-ok-fg motion-safe:animate-pulse' : 'bg-blocked-fg'}`}
      />
      {STATUS_TEXT[status]}
    </p>
  );
}

export function NewEventsPill({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed top-[calc(var(--header-h,0px)+3.25rem)] left-1/2 z-20 -translate-x-1/2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white shadow-lg hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      ↑ {formatCount(count)} new {count === 1 ? 'event' : 'events'}
    </button>
  );
}
