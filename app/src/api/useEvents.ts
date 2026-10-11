import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { fetchEvents } from './client';
import type { EventFilters } from './types';

export const PAGE_SIZE = 100;

export function useEvents(filters: EventFilters) {
  return useInfiniteQuery({
    queryKey: ['events', filters],
    queryFn: ({ pageParam, signal }) =>
      fetchEvents(filters, { cursor: pageParam, limit: PAGE_SIZE, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}
