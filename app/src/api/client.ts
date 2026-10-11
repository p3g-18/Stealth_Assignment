import type { EventDetail, EventFilters, EventsPage } from './types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }

  get retryable(): boolean {
    return this.status === null || this.status === 429 || this.status >= 500;
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(BASE_URL + path, { signal });
  } catch (err) {
    // aborted by us, not a network failure
    if (signal?.aborted) throw err;
    throw new ApiError('Could not reach the server. Check your connection.', null);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = typeof body?.error === 'string' ? body.error : response.statusText;
    throw new ApiError(message || `Request failed (${response.status})`, response.status);
  }

  return response.json() as Promise<T>;
}

function filtersToParams(filters: EventFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  for (const agent of filters.agents ?? []) params.append('agent', agent);
  if (filters.status) params.set('status', filters.status);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  return params;
}

export function fetchEvents(
  filters: EventFilters,
  options: { cursor?: string | null; limit?: number; signal?: AbortSignal } = {},
): Promise<EventsPage> {
  const params = filtersToParams(filters);
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.limit) params.set('limit', String(options.limit));
  return request<EventsPage>(`/events?${params}`, options.signal);
}

export function fetchEvent(id: string, signal?: AbortSignal): Promise<EventDetail> {
  return request<EventDetail>(`/events/${encodeURIComponent(id)}`, signal);
}

export function fetchAgents(signal?: AbortSignal): Promise<string[]> {
  return request<string[]>('/agents', signal);
}
