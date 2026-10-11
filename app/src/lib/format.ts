const timestampFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
  hour12: false,
});

export function formatTimestamp(iso: string): string {
  return timestampFormat.format(new Date(iso));
}

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function formatLatency(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
}

const countFormat = new Intl.NumberFormat();

export function formatCount(n: number): string {
  return countFormat.format(n);
}
