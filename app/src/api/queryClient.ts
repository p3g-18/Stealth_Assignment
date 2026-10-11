import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

/** Retries after the first failure. With ~1 in 8 requests failing, 2 retries
 *  make an unrecoverable failure roughly a 1 in 500 event. */
const MAX_RETRIES = 2;

export function shouldRetry(failureCount: number, error: unknown): boolean {
  // Only retry errors that might succeed next time (5xx, 429, network).
  // 4xx and non-API errors (bugs in our code) fail straight away.
  return error instanceof ApiError && error.retryable && failureCount < MAX_RETRIES;
}

/** 500 ms, then 1 s, with jitter so many clients don't retry in lockstep. */
export function retryDelay(attempt: number): number {
  const base = 500 * 2 ** attempt;
  return base + Math.random() * base * 0.5;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      retryDelay,
      // Reuse a result for 30 s, so going back to a previous search is instant.
      staleTime: 30_000,
      // Don't refetch when the tab regains focus: it would reshuffle a list
      // the user may be in the middle of reading.
      refetchOnWindowFocus: false,
    },
  },
});
