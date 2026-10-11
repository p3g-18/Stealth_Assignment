import { EventList } from './components/EventList';

// Filters arrive with the search/filter step; until then, show everything.
const NO_FILTERS = {};

export default function App() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Agent Activity Explorer</h1>
      <EventList filters={NO_FILTERS} />
    </main>
  );
}
