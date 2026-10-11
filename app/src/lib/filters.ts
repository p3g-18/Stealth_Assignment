import { EVENT_STATUSES, type EventFilters, type EventStatus } from '../api/types';

const FILTER_KEYS = ['q', 'agent', 'status', 'from', 'to'] as const;

function isStatus(value: string | null): value is EventStatus {
  return EVENT_STATUSES.includes(value as EventStatus);
}

function isDate(value: string | null): value is string {
  return value !== null && !Number.isNaN(Date.parse(value));
}

export function parseFilters(params: URLSearchParams): EventFilters {
  const filters: EventFilters = {};

  const q = params.get('q')?.trim();
  if (q) filters.q = q;

  const agents = [...new Set(params.getAll('agent').filter(Boolean))].sort();
  if (agents.length) filters.agents = agents;

  const status = params.get('status');
  if (isStatus(status)) filters.status = status;

  const from = params.get('from');
  if (isDate(from)) filters.from = from;

  const to = params.get('to');
  if (isDate(to)) filters.to = to;

  return filters;
}

export function withFilters(params: URLSearchParams, filters: EventFilters): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.q) next.set('q', filters.q);
  for (const agent of [...(filters.agents ?? [])].sort()) next.append('agent', agent);
  if (filters.status) next.set('status', filters.status);
  if (filters.from) next.set('from', filters.from);
  if (filters.to) next.set('to', filters.to);

  for (const [key, value] of params) {
    if (!(FILTER_KEYS as readonly string[]).includes(key)) next.append(key, value);
  }
  return next;
}

export function hasFilters(filters: EventFilters): boolean {
  return Object.keys(filters).length > 0;
}
