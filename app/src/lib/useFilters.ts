import { useCallback, useMemo } from 'react';
import type { EventFilters } from '../api/types';
import { parseFilters, withFilters } from './filters';
import { useSearchParams, type NavigateOptions } from './useSearchParams';

export function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);

  const setFilters = useCallback(
    (next: EventFilters, options?: NavigateOptions) => setParams(withFilters(params, next), options),
    [params, setParams],
  );

  return [filters, setFilters] as const;
}
