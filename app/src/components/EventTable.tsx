import { memo, type MouseEvent } from 'react';
import type { EventSummary } from '../api/types';
import { formatDate, formatLatency, formatTime, formatTimestamp } from '../lib/format';
import { StatusBadge } from './StatusBadge';

const th = 'sticky top-(--header-h) border-b border-line bg-subtle px-2 py-2 text-left font-semibold text-muted md:px-3';
const td = 'border-b border-line px-2 py-2 whitespace-nowrap md:px-3';
// below `md`, tool and latency fold into the agent and status cells
const wideOnly = 'hidden md:table-cell';

interface EventTableProps {
  events: EventSummary[];
  skeletonRows?: number;
  liveIds?: Set<string>;
  selectedId?: string | null;
  hrefFor?: (id: string) => string;
  onSelect?: (id: string) => void;
}

function isPlainClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export const EventTable = memo(function EventTable({
  events,
  skeletonRows = 0,
  liveIds,
  selectedId,
  hrefFor,
  onSelect,
}: EventTableProps) {
  return (
    <table className="w-full border-collapse" aria-busy={skeletonRows > 0}>
      <thead>
        <tr>
          <th scope="col" className={th}>
            <span className="md:hidden">Time</span>
            <span className="hidden md:inline">Timestamp</span>
          </th>
          <th scope="col" className={th}>
            <span className="md:hidden">Agent · tool</span>
            <span className="hidden md:inline">Agent</span>
          </th>
          <th scope="col" className={`${th} ${wideOnly}`}>Tool</th>
          <th scope="col" className={`${th} text-right md:text-left`}>Status</th>
          <th scope="col" className={`${th} ${wideOnly} text-right`}>Latency</th>
          <th scope="col" className={`${th} w-6 pl-0 md:pl-0`}>
            <span className="sr-only">Details</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            selected={event.id === selectedId}
            live={liveIds?.has(event.id) ?? false}
            href={hrefFor?.(event.id)}
            onSelect={onSelect}
          />
        ))}
        {Array.from({ length: skeletonRows }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </tbody>
    </table>
  );
});

interface EventRowProps {
  event: EventSummary;
  selected: boolean;
  live: boolean;
  href: string | undefined;
  onSelect?: (id: string) => void;
}

// memo: a row only re-renders when its own event, selection or link changes
const EventRow = memo(function EventRow({ event, selected, live, href, onSelect }: EventRowProps) {
  function handleRowClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('a')) return;
    if (window.getSelection()?.toString()) return;
    onSelect?.(event.id);
  }

  function handleLinkClick(e: MouseEvent) {
    // let cmd/ctrl-click open the event in a new tab
    if (!isPlainClick(e)) return;
    e.preventDefault();
    onSelect?.(event.id);
  }

  return (
    <tr
      data-event-id={event.id}
      aria-current={selected || undefined}
      onClick={handleRowClick}
      className={`group cursor-pointer ${selected ? 'bg-accent/12' : 'hover:bg-accent/6 focus-within:bg-accent/6'} ${live ? 'motion-safe:animate-row-in' : ''}`}
    >
      <td className={`${td} tabular-nums`}>
        <a
          href={href}
          onClick={handleLinkClick}
          className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <time dateTime={event.timestamp} title={event.timestamp}>
            <span className="hidden md:inline">{formatTimestamp(event.timestamp)}</span>
            <span className="md:hidden">
              {formatTime(event.timestamp)}
              <span className="block text-xs text-muted">{formatDate(event.timestamp)}</span>
            </span>
          </time>
        </a>
      </td>
      {/* max-w-0 + w-full: column takes the leftover width and truncates on phones */}
      <td className={`${td} w-full max-w-0 md:w-auto md:max-w-none`}>
        <div className="truncate">{event.agent}</div>
        <div className="truncate font-mono text-xs text-muted md:hidden">{event.tool}</div>
      </td>
      <td className={`${td} ${wideOnly} font-mono text-[13px]`}>{event.tool}</td>
      <td className={`${td} text-right md:text-left`}>
        <StatusBadge status={event.status} />
        <div className="text-xs text-muted tabular-nums md:hidden">{formatLatency(event.latencyMs)}</div>
      </td>
      <td className={`${td} ${wideOnly} text-right tabular-nums`}>{formatLatency(event.latencyMs)}</td>
      {/* visual cue that the row opens details; the timestamp link is what screen readers announce */}
      <td
        aria-hidden="true"
        className={`${td} w-6 pl-0 text-right text-lg leading-none md:pl-0 ${selected ? 'text-accent' : 'text-muted group-hover:text-accent group-focus-within:text-accent'}`}
      >
        ›
      </td>
    </tr>
  );
});

const SKELETON_CELLS = [
  { bar: 'w-16 md:w-36', cell: '' },
  { bar: 'w-28', cell: '' },
  { bar: 'w-24', cell: wideOnly },
  { bar: 'ml-auto w-12 md:ml-0 md:w-10', cell: '' },
  { bar: 'ml-auto w-14', cell: wideOnly },
  { bar: 'invisible', cell: 'w-6 pl-0 md:pl-0' },
];

function SkeletonRow() {
  return (
    <tr aria-hidden="true">
      {SKELETON_CELLS.map(({ bar, cell }, i) => (
        <td key={i} className={`${td} ${cell}`}>
          <div className={`h-4 rounded bg-line motion-safe:animate-pulse ${bar}`} />
        </td>
      ))}
    </tr>
  );
}
