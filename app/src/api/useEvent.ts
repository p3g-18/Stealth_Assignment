import { useQuery } from '@tanstack/react-query';
import { fetchEvent } from './client';

export function useEvent(id: string | null) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: ({ signal }) => fetchEvent(id!, signal),
    enabled: id !== null,
    staleTime: Infinity,
  });
}
