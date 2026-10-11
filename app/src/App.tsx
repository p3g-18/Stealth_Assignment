import { EventList } from './components/EventList';
import { SearchBox } from './components/SearchBox';
import { useFilters } from './lib/useFilters';

export default function App() {
  const [filters, setFilters] = useFilters();

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
      </div>

      <EventList filters={filters} />
    </main>
  );
}
