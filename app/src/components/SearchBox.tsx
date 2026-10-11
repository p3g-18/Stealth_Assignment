import { useEffect, useRef, useState, type FormEvent } from 'react';

const DEBOUNCE_MS = 300;

interface SearchBoxProps {
  value: string;
  onSearch: (query: string) => void;
}

export function SearchBox({ value, onSearch }: SearchBoxProps) {
  const [text, setText] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  // URL changed from outside (back/forward, link)
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== text.trim()) setText(value);
  }

  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  useEffect(() => {
    const query = text.trim();
    if (query === value) return;
    const timer = setTimeout(() => onSearchRef.current(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, value]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const query = text.trim();
    if (query !== value) onSearch(query);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="w-full sm:w-auto sm:min-w-56 sm:flex-1">
      <label htmlFor="search" className="sr-only">
        Search events
      </label>
      <input
        id="search"
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Search agent, tool or arguments…"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-md border border-line bg-bg px-3 py-1.5 placeholder:text-muted pointer-coarse:py-2.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      />
    </form>
  );
}
