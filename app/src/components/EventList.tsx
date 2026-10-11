import { useEffect, useRef } from 'react';
import type { EventFilters } from '../api/types';
import { useEvents } from '../api/useEvents';
import { formatCount } from '../lib/format';
import { EventTable } from './EventTable';

const messageClass = 'px-4 py-6 text-center text-muted';
const buttonClass =
  'mt-2 rounded-md border border-line bg-bg px-3 py-1.5 font-medium text-fg hover:bg-subtle';

interface EventListProps {
  filters: EventFilters;
}

export function EventList({ filters }: EventListProps) {
  const {
    data,
    error,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useEvents(filters);

  const events = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  // Load the next page when the user scrolls near the end of the table.
  // After a failed page we stop, so a broken API isn't hammered; the user
  // retries with the button instead.
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
    return <p className={messageClass}>Loading events…</p>;
  }

  if (isError && events.length === 0) {
    return (
      <div className={messageClass} role="alert">
        <p>Couldn’t load events: {error.message}</p>
        <button type="button" className={buttonClass} onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return <p className={messageClass}>No events found.</p>;
  }

  return (
    <section aria-label="Events">
      <p className="mb-2 text-muted">
        Showing {formatCount(events.length)} of {formatCount(total)} events
      </p>

      <EventTable events={events} />

      <div ref={sentinelRef} className={messageClass}>
        {isFetchingNextPage && <p>Loading more…</p>}
        {isFetchNextPageError && (
          <div role="alert">
            <p>Couldn’t load more events: {error?.message}</p>
            <button type="button" className={buttonClass} onClick={() => fetchNextPage()}>
              Try again
            </button>
          </div>
        )}
        {hasNextPage && !isFetchingNextPage && !isFetchNextPageError && (
          <button type="button" className={buttonClass} onClick={() => fetchNextPage()}>
            Load more
          </button>
        )}
        {!hasNextPage && <p>End of results.</p>}
      </div>
    </section>
  );
}
