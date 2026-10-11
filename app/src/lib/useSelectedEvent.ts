import { useCallback } from 'react';
import { useSearchParams } from './useSearchParams';

function currentParams() {
  return new URLSearchParams(window.location.search);
}

export function useSelectedEvent() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('event') || null;

  // everything except `event`, so row links don't change when the selection does
  const withoutEvent = new URLSearchParams(params);
  withoutEvent.delete('event');
  const baseQuery = withoutEvent.toString();

  const hrefFor = useCallback(
    (id: string) => {
      const next = new URLSearchParams(baseQuery);
      next.set('event', id);
      return `?${next}`;
    },
    [baseQuery],
  );

  // read the URL at call time so these stay the same function across renders
  const select = useCallback(
    (id: string) => {
      const next = currentParams();
      const wasOpen = next.has('event');
      next.set('event', id);
      // switching between events shouldn't stack up history entries
      setParams(next, { replace: wasOpen });
    },
    [setParams],
  );

  const close = useCallback(() => {
    const next = currentParams();
    next.delete('event');
    setParams(next);
  }, [setParams]);

  return { selectedId, hrefFor, select, close };
}
