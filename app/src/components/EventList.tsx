import { useEffect, useRef } from 'react';
import type { EventFilters } from '../api/types';
import { useEvents } from '../api/useEvents';
import { formatCount } from '../lib/format';
import { useDelayedFlag } from '../lib/useDelayedFlag';
import { EventTable } from './EventTable';
import { ErrorMessage, SlowNotice, StatusMessage, buttonClass } from './StatusMessage';

const SLOW_AFTER_MS = 1000;

interface EventListProps {
  filters: EventFilters;
}

export function EventList({ filters }: EventListProps) {
  const {
    data,
    error,
    isPending,
    isError,
    isFetching,
    failureCount,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useEvents(filters);

  const events = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const isSlow = useDelayedFlag(isFetching, SLOW_AFTER_MS);
  const isRetrying = isFetching && failureCount > 0;

  // don't keep auto-loading after a failed page
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canAutoLoad = hasNextPage && !isFetchingNextPage && !isFetchNextPageError;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !canAutoLoad) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) fetchNextPage();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canAutoLoad, fetchNextPage]);

  if (isPending) {
    return (
      <section aria-label="Events">
        <p className="mb-2 text-muted" role="status">
          Loading events…
        </p>
        <EventTable events={[]} skeletonRows={12} />
        {isSlow && (
          <div className="py-4 text-center">
            <SlowNotice retrying={isRetrying} />
          </div>
        )}
      </section>
    );
  }

  if (isError && events.length === 0) {
    return <ErrorMessage error={error} onRetry={() => refetch()} />;
  }

  if (events.length === 0) {
    return (
      <StatusMessage title="No events found">
        There are no events for this view yet.
      </StatusMessage>
    );
  }

  return (
    <section aria-label="Events">
      <p className="mb-2 text-muted" role="status">
        Showing {formatCount(events.length)} of {formatCount(total)} events
      </p>

      <EventTable events={events} />

      <div ref={sentinelRef} className="flex flex-col items-center gap-2 px-4 py-6 text-center text-muted">
        {isFetchingNextPage && (
          <>
            <p>Loading more…</p>
            {isSlow && <SlowNotice retrying={isRetrying} />}
          </>
        )}
        {isFetchNextPageError && (
          <ErrorMessage error={error} onRetry={() => fetchNextPage()} />
        )}
        {canAutoLoad && (
          <button type="button" className={buttonClass} onClick={() => fetchNextPage()}>
            Load more
          </button>
        )}
        {!hasNextPage && <p>You’ve reached the end — all {formatCount(total)} events shown.</p>}
      </div>
    </section>
  );
}
