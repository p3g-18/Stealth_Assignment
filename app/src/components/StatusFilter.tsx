import { EVENT_STATUSES, type EventStatus } from '../api/types';

const OPTIONS: { value: EventStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  ...EVENT_STATUSES.map((status) => ({ value: status, label: status })),
];

interface StatusFilterProps {
  value: EventStatus | undefined;
  onChange: (status: EventStatus | undefined) => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <fieldset className="flex overflow-hidden rounded-md border border-line">
      <legend className="sr-only">Status</legend>
      {OPTIONS.map((option) => (
        <label
          key={option.label}
          className="cursor-pointer border-r border-line px-3 py-1.5 font-medium pointer-coarse:py-2.5 capitalize text-muted last:border-r-0 hover:bg-subtle has-checked:bg-fg has-checked:text-bg has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-accent"
        >
          <input
            type="radio"
            name="status"
            className="sr-only"
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
