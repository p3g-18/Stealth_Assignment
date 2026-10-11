import { AgentFilter } from './components/AgentFilter';
import { EventList } from './components/EventList';
import { SearchBox } from './components/SearchBox';
import { StatusFilter } from './components/StatusFilter';
import { hasFilters } from './lib/filters';
import { useFilters } from './lib/useFilters';

export default function App() {
  const [filters, setFilters] = useFilters();
  const clearFilters = () => setFilters({});

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Agent Activity Explorer</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox
          value={filters.q ?? ''}
          onSearch={(q) =>
            // new search gets its own history entry; refining it replaces that entry
            setFilters({ ...filters, q: q || undefined }, { replace: Boolean(filters.q) && Boolean(q) })
          }
        />
        <AgentFilter
          selected={filters.agents ?? []}
          onChange={(agents) => setFilters({ ...filters, agents })}
        />
        <StatusFilter value={filters.status} onChange={(status) => setFilters({ ...filters, status })} />
        {hasFilters(filters) && (
          <button
            type="button"
            className="rounded-md px-2 py-1.5 font-medium text-accent hover:bg-subtle"
            onClick={clearFilters}
          >
            Clear
          </button>
        )}
      </div>

      <EventList filters={filters} onClearFilters={clearFilters} />
    </main>
  );
}
