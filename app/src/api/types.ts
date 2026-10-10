// Shapes returned by the mock API. See ASSIGNMENT.md "The API".

export type EventStatus = 'ok' | 'blocked' | 'error';

export const EVENT_STATUSES: readonly EventStatus[] = ['ok', 'blocked', 'error'];

/** One row from GET /events. */
export interface EventSummary {
  id: string;
  timestamp: string; // ISO 8601, UTC
  agent: string;
  tool: string;
  status: EventStatus;
  latencyMs: number;
  argsPreview: string;
}

/** GET /events response. `nextCursor` is null on the last page. */
export interface EventsPage {
  items: EventSummary[];
  nextCursor: string | null;
  total: number;
}

/** GET /events/:id response. `args` and `result` can be any JSON value. */
export interface EventDetail extends Omit<EventSummary, 'argsPreview'> {
  args: unknown;
  result: unknown;
  policyMatches: string[];
}

/** Filters shared by /events and /events/histogram. */
export interface EventFilters {
  q?: string;
  agents?: string[];
  status?: EventStatus;
  from?: string;
  to?: string;
}
