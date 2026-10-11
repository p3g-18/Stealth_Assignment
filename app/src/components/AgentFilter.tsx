import { useEffect, useId, useRef, useState, type FocusEvent } from 'react';
import { useAgents } from '../api/useAgents';
import { buttonClass } from './StatusMessage';

interface AgentFilterProps {
  selected: string[];
  onChange: (agents: string[]) => void;
}

function buttonLabel(selected: string[]) {
  if (selected.length === 0) return 'All agents';
  if (selected.length === 1) return selected[0];
  return `${selected.length} agents`;
}

export function AgentFilter({ selected, onChange }: AgentFilterProps) {
  const { data: agents, isPending, isError, refetch } = useAgents();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    // capture phase, so this runs before the detail panel's Esc handler
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  function handleBlur(event: FocusEvent) {
    if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
  }

  function toggle(agent: string) {
    const next = selected.includes(agent)
      ? selected.filter((a) => a !== agent)
      : [...selected, agent];
    onChange(next.sort());
  }

  // keep agents from the URL visible even if /agents doesn't list them
  const options = [...new Set([...(agents ?? []), ...selected])].sort();

  return (
    <div ref={rootRef} className="relative" onBlur={handleBlur}>
      <button
        ref={buttonRef}
        type="button"
        className={`${buttonClass} flex items-center gap-2`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="max-w-40 truncate">{buttonLabel(selected)}</span>
        <span aria-hidden="true" className="text-xs text-muted">
          ▾
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute left-0 z-20 mt-1 w-64 rounded-md border border-line bg-bg p-1 shadow-lg"
        >
          {isPending && <p className="px-2 py-1.5 text-muted">Loading agents…</p>}

          {isError && (
            <div className="px-2 py-1.5" role="alert">
              <p className="mb-2 text-error-fg">Couldn’t load the agent list.</p>
              <button type="button" className={buttonClass} onClick={() => refetch()}>
                Try again
              </button>
            </div>
          )}

          {options.length > 0 && (
            <fieldset>
              <legend className="sr-only">Agents</legend>
              <ul className="max-h-72 overflow-y-auto">
                {options.map((agent) => (
                  <li key={agent}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-subtle">
                      <input
                        type="checkbox"
                        checked={selected.includes(agent)}
                        onChange={() => toggle(agent)}
                        className="accent-accent"
                      />
                      {agent}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}

          {selected.length > 0 && (
            <button
              type="button"
              className="mt-1 w-full rounded px-2 py-1.5 text-left text-accent hover:bg-subtle"
              onClick={() => onChange([])}
            >
              Clear agent filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
