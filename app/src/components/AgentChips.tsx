import { useRef, useState, type KeyboardEvent } from 'react';
import { useAgents } from '../api/useAgents';

interface AgentChipsProps {
  selected: string[];
  onChange: (agents: string[]) => void;
}

const chipClass =
  'shrink-0 rounded-full border px-3 py-1 text-[13px] font-medium whitespace-nowrap pointer-coarse:py-2 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const onClass = 'border-accent bg-accent text-white';
const offClass = 'border-line bg-bg text-fg hover:bg-subtle';

export function AgentChips({ selected, onChange }: AgentChipsProps) {
  const { data: agents, isPending, isError, refetch } = useAgents();
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // keep agents from the URL visible even if /agents doesn't list them
  const options = [...new Set([...(agents ?? []), ...selected])].sort();
  const chips = [null, ...options];

  function toggle(agent: string) {
    const next = selected.includes(agent)
      ? selected.filter((a) => a !== agent)
      : [...selected, agent];
    onChange(next.sort());
  }

  // toolbar pattern: one Tab stop for the row, arrow keys move between chips
  function handleKeyDown(event: KeyboardEvent) {
    const last = chips.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: Math.min(activeIndex + 1, last),
      ArrowLeft: Math.max(activeIndex - 1, 0),
      Home: 0,
      End: last,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = moves[event.key];
    setActiveIndex(next);
    buttonsRef.current[next]?.focus();
  }

  if (isError) {
    return (
      <p role="alert" className="text-[13px] text-muted">
        Couldn’t load the agent list.{' '}
        <button type="button" className="font-medium text-accent hover:underline" onClick={() => refetch()}>
          Try again
        </button>
      </p>
    );
  }

  return (
    <div
      role="toolbar"
      aria-label="Filter by agent"
      onKeyDown={handleKeyDown}
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-1 pr-8 [scrollbar-width:thin] [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]"
    >
      {isPending &&
        Array.from({ length: 6 }, (_, i) => (
          <span key={i} aria-hidden="true" className="h-7 w-28 shrink-0 rounded-full bg-line motion-safe:animate-pulse" />
        ))}

      {!isPending &&
        chips.map((agent, i) => {
          const pressed = agent === null ? selected.length === 0 : selected.includes(agent);
          return (
            <button
              key={agent ?? '__all'}
              ref={(el) => {
                buttonsRef.current[i] = el;
              }}
              type="button"
              aria-pressed={pressed}
              tabIndex={i === Math.min(activeIndex, chips.length - 1) ? 0 : -1}
              onFocus={() => setActiveIndex(i)}
              onClick={() => (agent === null ? onChange([]) : toggle(agent))}
              className={`${chipClass} ${pressed ? onClass : offClass}`}
            >
              {agent ?? 'All agents'}
            </button>
          );
        })}
    </div>
  );
}
