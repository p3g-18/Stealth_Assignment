import type { EventStatus } from '../api/types';

const STATUS_STYLES: Record<EventStatus, string> = {
  ok: 'bg-ok-bg text-ok-fg',
  blocked: 'bg-blocked-bg text-blocked-fg',
  error: 'bg-error-bg text-error-fg',
};

export function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-px text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}
