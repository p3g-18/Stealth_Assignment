import type { ReactNode } from 'react';
import { ApiError } from '../api/client';
import { describeError } from '../lib/describeError';

export const buttonClass =
  'rounded-md border border-line bg-bg px-3 py-1.5 font-medium text-fg hover:bg-subtle ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

interface StatusMessageProps {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
}

export function StatusMessage({ title, children, action, tone = 'neutral' }: StatusMessageProps) {
  return (
    <div
      className="flex flex-col items-center gap-2 px-4 py-10 text-center"
      role={tone === 'error' ? 'alert' : undefined}
    >
      <p className={`font-semibold ${tone === 'error' ? 'text-error-fg' : 'text-fg'}`}>{title}</p>
      {children && <p className="max-w-md text-muted">{children}</p>}
      {action}
    </div>
  );
}

interface ErrorMessageProps {
  error: unknown;
  onRetry: () => void;
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  const { title, detail } = describeError(error);
  const retryable = !(error instanceof ApiError) || error.retryable;
  return (
    <StatusMessage
      tone="error"
      title={title}
      action={
        retryable && (
          <button type="button" className={buttonClass} onClick={onRetry}>
            Try again
          </button>
        )
      }
    >
      {detail}
    </StatusMessage>
  );
}

export function SlowNotice({ retrying }: { retrying: boolean }) {
  return (
    <p className="text-muted">
      {retrying
        ? 'The server had a hiccup, retrying…'
        : 'This is taking longer than usual. Still working on it…'}
    </p>
  );
}
