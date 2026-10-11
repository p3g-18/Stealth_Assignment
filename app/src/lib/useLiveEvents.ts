import { useEffect, useReducer, useRef, useState } from 'react';
import { openEventStream, type StreamStatus } from '../api/stream';
import type { EventFilters, EventSummary } from '../api/types';
import { matchesFilters } from './matchesFilters';

const BATCH_MS = 500;
const MAX_BUFFER = 5_000;

interface LiveState {
  shown: EventSummary[];
  pending: EventSummary[];
}

type LiveAction =
  | { type: 'add'; events: EventSummary[]; reveal: boolean }
  | { type: 'reveal' }
  | { type: 'reset' }
  | { type: 'dropPending' };

const EMPTY: LiveState = { shown: [], pending: [] };

function newestFirst(a: EventSummary, b: EventSummary) {
  return Date.parse(b.timestamp) - Date.parse(a.timestamp) || b.id.localeCompare(a.id);
}

function reducer(state: LiveState, action: LiveAction): LiveState {
  switch (action.type) {
    case 'add': {
      const seen = new Set([...state.shown, ...state.pending].map((e) => e.id));
      const fresh: EventSummary[] = [];
      for (const event of action.events) {
        if (seen.has(event.id)) continue;
        seen.add(event.id);
        fresh.push(event);
      }
      if (fresh.length === 0 && !(action.reveal && state.pending.length)) return state;
      if (action.reveal) {
        return { shown: [...state.shown, ...state.pending, ...fresh].sort(newestFirst), pending: [] };
      }
      return { ...state, pending: [...state.pending, ...fresh].sort(newestFirst) };
    }
    case 'reveal':
      if (state.pending.length === 0) return state;
      return { shown: [...state.shown, ...state.pending].sort(newestFirst), pending: [] };
    case 'dropPending':
      return state.pending.length ? { ...state, pending: [] } : state;
    case 'reset':
      return state === EMPTY ? state : EMPTY;
  }
}

interface Options {
  enabled: boolean;
  filters: EventFilters;
  ready: boolean;
  newestLoaded: string | undefined;
  loadedIds: Set<string>;
  canReveal: () => boolean;
}

export function useLiveEvents({ enabled, filters, ready, newestLoaded, loadedIds, canReveal }: Options) {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  const [status, setStatus] = useState<StreamStatus>('connecting');

  const filtersKey = JSON.stringify(filters);
  const [prevKey, setPrevKey] = useState(filtersKey);
  if (prevKey !== filtersKey) {
    setPrevKey(filtersKey);
    dispatch({ type: 'reset' });
  }

  const latest = useRef({ filters, ready, newestLoaded, loadedIds, canReveal });
  useEffect(() => {
    latest.current = { filters, ready, newestLoaded, loadedIds, canReveal };
  });

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: 'dropPending' });
      return;
    }

    const buffer: EventSummary[] = [];
    const close = openEventStream({
      onEvent: (event) => {
        buffer.push(event);
        if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
      },
      onStatus: setStatus,
    });

    const timer = setInterval(() => {
      const { filters, ready, newestLoaded, loadedIds, canReveal } = latest.current;
      // hold events until the list for these filters has loaded
      if (!ready) return;
      const floor = newestLoaded ? Date.parse(newestLoaded) : -Infinity;
      const events = buffer
        .splice(0)
        .filter((e) => Date.parse(e.timestamp) > floor && !loadedIds.has(e.id) && matchesFilters(e, filters));
      dispatch({ type: 'add', events, reveal: canReveal() });
    }, BATCH_MS);

    return () => {
      close();
      clearInterval(timer);
    };
  }, [enabled]);

  return {
    status,
    shown: state.shown,
    pendingCount: state.pending.length,
    reveal: () => dispatch({ type: 'reveal' }),
  };
}
