import type { MouseEvent } from 'react';
import type { EventSummary } from '../api/types';
import { formatLatency, formatTimestamp } from '../lib/format';
import { StatusBadge } from './StatusBadge';

const th = 'sticky top-0 border-b border-line bg-subtle px-3 py-2 text-left font-semibold text-muted';
const td = 'border-b border-line px-3 py-2 whitespace-nowrap';

interface EventTableProps {
  events: EventSummary[];
  skeletonRows?: number;
  selectedId?: string | null;
  hrefFor?: (id: string) => string;
  onSelect?: (id: string) => void;
}

function isPlainClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function EventTable({ events, skeletonRows = 0, selectedId, hrefFor, onSelect }: EventTableProps) {
  function handleRowClick(event: MouseEvent, id: string) {
    if ((event.target as HTMLElement).closest('a')) return;
    if (window.getSelection()?.toString()) return;
    onSelect?.(id);
  }

  function handleLinkClick(event: MouseEvent, id: string) {
    // let cmd/ctrl-click open the event in a new tab
    if (!isPlainClick(event)) return;
    event.preventDefault();
    onSelect?.(id);
  }

  return (
    <table className="w-full border-collapse" aria-busy={skeletonRows > 0}>
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
        {events.map((event) => {
          const selected = event.id === selectedId;
          return (
            <tr
              key={event.id}
              data-event-id={event.id}
              aria-current={selected || undefined}
              onClick={(e) => handleRowClick(e, event.id)}
              className={`cursor-pointer ${selected ? 'bg-accent/10' : 'hover:bg-subtle'}`}
            >
              <td className={`${td} tabular-nums`}>
                <a
                  href={hrefFor?.(event.id)}
                  onClick={(e) => handleLinkClick(e, event.id)}
                  className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <time dateTime={event.timestamp} title={event.timestamp}>
                    {formatTimestamp(event.timestamp)}
                  </time>
                </a>
              </td>
              <td className={td}>{event.agent}</td>
              <td className={`${td} font-mono text-[13px]`}>{event.tool}</td>
              <td className={td}>
                <StatusBadge status={event.status} />
              </td>
              <td className={`${td} text-right tabular-nums`}>{formatLatency(event.latencyMs)}</td>
            </tr>
          );
        })}
        {Array.from({ length: skeletonRows }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </tbody>
    </table>
  );
}

const SKELETON_WIDTHS = ['w-36', 'w-28', 'w-24', 'w-10', 'w-14'];

function SkeletonRow() {
  return (
    <tr aria-hidden="true">
      {SKELETON_WIDTHS.map((width, i) => (
        <td key={i} className={td}>
          <div
            className={`h-4 rounded bg-line motion-safe:animate-pulse ${width} ${i === 4 ? 'ml-auto' : ''}`}
          />
        </td>
      ))}
    </tr>
  );
}
