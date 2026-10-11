import { EventList } from './components/EventList';
import { useFilters } from './lib/useFilters';

export default function App() {
  const [filters] = useFilters();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Agent Activity Explorer</h1>
      <EventList filters={filters} />
    </main>
  );
}
