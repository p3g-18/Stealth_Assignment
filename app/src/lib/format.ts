const timestampFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
  hour12: false,
});

/** e.g. "Oct 9, 14:21:07.123", in the viewer's time zone. */
export function formatTimestamp(iso: string): string {
  return timestampFormat.format(new Date(iso));
}

/** e.g. "412 ms", "1.24 s". */
export function formatLatency(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
}

const countFormat = new Intl.NumberFormat();

/** e.g. "50,000". */
export function formatCount(n: number): string {
  return countFormat.format(n);
}
