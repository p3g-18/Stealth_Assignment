import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

const MAX_RETRIES = 2;

export function shouldRetry(failureCount: number, error: unknown): boolean {
  return error instanceof ApiError && error.retryable && failureCount < MAX_RETRIES;
}

export function retryDelay(attempt: number): number {
  const base = 500 * 2 ** attempt;
  return base + Math.random() * base * 0.5;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      retryDelay,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
