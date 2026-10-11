import { BASE_URL } from './client';
import type { EventSummary } from './types';

export type StreamStatus = 'connecting' | 'open' | 'reconnecting';

const MAX_RETRY_MS = 15_000;

function isEventSummary(value: unknown): value is EventSummary {
  const v = value as EventSummary;
  return typeof v?.id === 'string' && typeof v.timestamp === 'string' && typeof v.agent === 'string';
}

export function openEventStream(handlers: {
  onEvent: (event: EventSummary) => void;
  onStatus: (status: StreamStatus) => void;
}): () => void {
  let source: EventSource | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;

  const connect = () => {
    handlers.onStatus(attempt === 0 ? 'connecting' : 'reconnecting');
    source = new EventSource(`${BASE_URL}/stream`);

    source.onopen = () => {
      attempt = 0;
      handlers.onStatus('open');
    };

    source.onmessage = (message) => {
      try {
        const data: unknown = JSON.parse(message.data);
        if (isEventSummary(data)) handlers.onEvent(data);
      } catch {
        // ignore malformed messages
      }
    };

    source.onerror = () => {
      handlers.onStatus('reconnecting');
      // CONNECTING: the browser retries on its own. CLOSED (e.g. a 500): we have to.
      if (source?.readyState !== EventSource.CLOSED) return;
      source.close();
      const delay = Math.min(1000 * 2 ** attempt, MAX_RETRY_MS);
      attempt += 1;
      retryTimer = setTimeout(connect, delay);
    };
  };

  connect();

  return () => {
    clearTimeout(retryTimer);
    source?.close();
  };
}
