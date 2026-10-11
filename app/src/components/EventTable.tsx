import type { EventStatus, EventSummary } from '../api/types';
import { formatLatency, formatTimestamp } from '../lib/format';

const STATUS_STYLES: Record<EventStatus, string> = {
  ok: 'bg-ok-bg text-ok-fg',
  blocked: 'bg-blocked-bg text-blocked-fg',
  error: 'bg-error-bg text-error-fg',
};

// Sticky so column names stay visible while scrolling a long list.
const th = 'sticky top-0 border-b border-line bg-subtle px-3 py-2 text-left font-semibold text-muted';
const td = 'border-b border-line px-3 py-2 whitespace-nowrap';

interface EventTableProps {
  events: EventSummary[];
}

export function EventTable({ events }: EventTableProps) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th scope="col" className={th}>Timestamp</th>
          <th scope="col" className={th}>Agent</th>
          <th scope="col" className={th}>Tool</th>
          <th scope="col" className={th}>Status</th>
          <th scope="col" className={`${th} text-right`}>Latency</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.id}>
            <td className={`${td} tabular-nums`}>
              <time dateTime={event.timestamp} title={event.timestamp}>
                {formatTimestamp(event.timestamp)}
              </time>
            </td>
            <td className={td}>{event.agent}</td>
            <td className={`${td} font-mono text-[13px]`}>{event.tool}</td>
            <td className={td}>
              <span className={`inline-block rounded-full px-2 py-px text-xs font-semibold ${STATUS_STYLES[event.status]}`}>
                {event.status}
              </span>
            </td>
            {/* tabular-nums: equal-width digits so latencies line up. */}
            <td className={`${td} text-right tabular-nums`}>{formatLatency(event.latencyMs)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
