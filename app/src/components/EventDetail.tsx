import { useEffect, useRef, type ReactNode } from 'react';
import { ApiError } from '../api/client';
import type { EventDetail as EventDetailData } from '../api/types';
import { useEvent } from '../api/useEvent';
import { formatLatency } from '../lib/format';
import { useDelayedFlag } from '../lib/useDelayedFlag';
import { JsonBlock } from './JsonBlock';
import { StatusBadge } from './StatusBadge';
import { ErrorMessage, SlowNotice, StatusMessage } from './StatusMessage';

interface EventDetailProps {
  id: string;
  onClose: () => void;
}

export function EventDetail({ id, onClose }: EventDetailProps) {
  const { data, error, isPending, isError, isFetching, failureCount, refetch } = useEvent(id);
  const isSlow = useDelayedFlag(isFetching, 1000);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <aside
      aria-labelledby="event-detail-title"
      className="fixed inset-y-0 right-0 z-30 flex w-full max-w-xl flex-col border-l border-line bg-bg shadow-2xl"
    >
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2
            id="event-detail-title"
            ref={headingRef}
            tabIndex={-1}
            className="truncate font-mono text-base font-semibold focus:outline-none"
          >
            {data ? data.tool : 'Event details'}
          </h2>
          <p className="truncate text-muted">{data ? data.agent : id}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          title="Close (Esc)"
          className="-mr-2 rounded-md px-2 py-1 text-lg leading-none text-muted hover:bg-subtle hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
        >
          ×
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isPending && (
          <div role="status" className="space-y-3">
            <p className="text-muted">Loading event…</p>
            {isSlow && <SlowNotice retrying={isFetching && failureCount > 0} />}
          </div>
        )}

        {isError &&
          (notFound ? (
            <StatusMessage tone="error" title="Event not found">
              No event with id <code className="font-mono">{id}</code>. The link may be wrong or the
              event may have been removed.
            </StatusMessage>
          ) : (
            <ErrorMessage error={error} onRetry={() => refetch()} />
          ))}

        {data && <DetailBody key={data.id} event={data} />}
      </div>
    </aside>
  );
}

function DetailBody({ event }: { event: EventDetailData }) {
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
        <Field label="Status">
          <StatusBadge status={event.status} />
        </Field>
        <Field label="Time">
          <time dateTime={event.timestamp} className="tabular-nums">
            {new Date(event.timestamp).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'medium',
            })}
          </time>
          <span className="block text-xs text-muted tabular-nums">{event.timestamp}</span>
        </Field>
        <Field label="Latency">
          <span className="tabular-nums">{formatLatency(event.latencyMs)}</span>
        </Field>
        <Field label="Event ID">
          <code className="font-mono text-xs break-all">{event.id}</code>
        </Field>
      </dl>

      <Section title="Policy matches">
        {event.policyMatches.length === 0 ? (
          <p className="text-muted">No policies matched.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {event.policyMatches.map((rule) => (
              <li
                key={rule}
                className="rounded-md bg-blocked-bg px-2 py-0.5 font-mono text-xs text-blocked-fg"
              >
                {rule}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Arguments">
        <JsonBlock value={event.args} />
      </Section>

      <Section title="Result">
        <JsonBlock value={event.result} />
      </Section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}
