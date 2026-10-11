import { useQuery } from '@tanstack/react-query';
import { fetchAgents } from './client';

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: ({ signal }) => fetchAgents(signal),
    staleTime: Infinity,
  });
}
