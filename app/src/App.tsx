import { useState } from 'react';
import { AgentChips } from './components/AgentChips';
import { EventDetail } from './components/EventDetail';
import { EventList } from './components/EventList';
import { SearchBox } from './components/SearchBox';
import { StatusFilter } from './components/StatusFilter';
import { hasFilters } from './lib/filters';
import { useFilters } from './lib/useFilters';
import { useSelectedEvent } from './lib/useSelectedEvent';
import { useStickyHeight } from './lib/useStickyHeight';

export default function App() {
  const [filters, setFilters] = useFilters();
  const clearFilters = () => setFilters({});
  const { selectedId, hrefFor, select, close } = useSelectedEvent();
  const headerRef = useStickyHeight<HTMLElement>('--header-h');
  const [live, setLive] = useState(false);

  const closeDetail = () => {
    const id = selectedId;
    close();
    if (id) {
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`tr[data-event-id="${CSS.escape(id)}"] a`)?.focus();
      });
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-6">
      <header ref={headerRef} className="sticky top-0 z-10 border-b border-line bg-bg pt-3 pb-3 sm:pt-6">
        <div className="mb-2 flex items-center justify-between gap-4 sm:mb-4">
          <h1 className="text-lg font-semibold sm:text-xl">Agent Activity Explorer</h1>
          {hasFilters(filters) && (
            <button
              type="button"
              className="-mr-2 rounded-md px-2 py-1 font-medium text-accent hover:bg-subtle"
              onClick={clearFilters}
            >
              <span className="sm:hidden">Clear</span>
              <span className="hidden sm:inline">Clear filters</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SearchBox
            value={filters.q ?? ''}
            onSearch={(q) =>
              // new search gets its own history entry; refining it replaces that entry
              setFilters({ ...filters, q: q || undefined }, { replace: Boolean(filters.q) && Boolean(q) })
            }
          />
          <StatusFilter value={filters.status} onChange={(status) => setFilters({ ...filters, status })} />
          <button
            type="button"
            aria-pressed={live}
            onClick={() => setLive((on) => !on)}
            className={`flex items-center gap-2 rounded-md border px-3 py-1.5 font-medium pointer-coarse:py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              live ? 'border-ok-fg bg-ok-bg text-ok-fg' : 'border-line bg-bg text-fg hover:bg-subtle'
            }`}
          >
            <span aria-hidden="true" className={`size-2 rounded-full ${live ? 'bg-ok-fg' : 'bg-muted'}`} />
            Live
          </button>
        </div>

        <div className="mt-2">
          <AgentChips
            selected={filters.agents ?? []}
            onChange={(agents) => setFilters({ ...filters, agents })}
          />
        </div>
      </header>

      <EventList
        filters={filters}
        onClearFilters={clearFilters}
        selectedId={selectedId}
        hrefFor={hrefFor}
        onSelect={select}
        live={live}
      />

      {selectedId && <EventDetail id={selectedId} onClose={closeDetail} />}
    </main>
  );
}
