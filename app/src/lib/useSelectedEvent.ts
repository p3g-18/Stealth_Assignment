import { useCallback } from 'react';
import { useSearchParams } from './useSearchParams';

export function useSelectedEvent() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('event') || null;

  const hrefFor = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params);
      next.set('event', id);
      return `?${next}`;
    },
    [params],
  );

  const select = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params);
      next.set('event', id);
      // switching between events shouldn't stack up history entries
      setParams(next, { replace: selectedId !== null });
    },
    [params, setParams, selectedId],
  );

  const close = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('event');
    setParams(next);
  }, [params, setParams]);

  return { selectedId, hrefFor, select, close };
}
