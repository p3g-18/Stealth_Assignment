import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchEvents } from './client';
import type { EventFilters } from './types';

/** Rows per request. The API allows up to 200; 100 keeps each response
 *  around 28 KB so the next page arrives quickly. */
export const PAGE_SIZE = 100;

/**
 * All pages loaded so far for one set of filters. Each page is fetched with the
 * cursor from the page before it; `fetchNextPage()` loads the next one.
 */
export function useEvents(filters: EventFilters) {
  return useInfiniteQuery({
    // A different filter set is a different list with its own cache entry,
    // so changing filters always restarts from the first page.
    queryKey: ['events', filters],
    queryFn: ({ pageParam, signal }) =>
      fetchEvents(filters, { cursor: pageParam, limit: PAGE_SIZE, signal }),
    initialPageParam: null as string | null,
    // `undefined` tells React Query there are no more pages.
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
