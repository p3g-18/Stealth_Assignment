import { useState } from 'react';

const PREVIEW_CHARS = 20_000;

export function JsonBlock({ value }: { value: unknown }) {
  const [expanded, setExpanded] = useState(false);

  if (value === undefined) return <p className="text-muted">—</p>;

  const text = JSON.stringify(value, null, 2);
  const truncated = !expanded && text.length > PREVIEW_CHARS;

  return (
    <div>
      <pre className="max-h-96 overflow-auto rounded-md border border-line bg-subtle p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
        {truncated ? `${text.slice(0, PREVIEW_CHARS)}\n…` : text}
      </pre>
      {truncated && (
        <button
          type="button"
          className="mt-1 text-accent hover:underline"
          onClick={() => setExpanded(true)}
        >
          Show all ({Math.round(text.length / 1024)} KB)
        </button>
      )}
    </div>
  );
}
