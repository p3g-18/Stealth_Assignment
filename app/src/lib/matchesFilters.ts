import type { EventFilters, EventSummary } from '../api/types';

export function matchesFilters(event: EventSummary, filters: EventFilters): boolean {
  if (filters.status && event.status !== filters.status) return false;
  if (filters.agents?.length && !filters.agents.includes(event.agent)) return false;
  const time = Date.parse(event.timestamp);
  if (filters.from && time < Date.parse(filters.from)) return false;
  if (filters.to && time >= Date.parse(filters.to)) return false;
  if (filters.q) {
    const needle = filters.q.toLowerCase();
    const haystack = `${event.agent} ${event.tool} ${event.argsPreview}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}
