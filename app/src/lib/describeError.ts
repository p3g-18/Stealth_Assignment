import { ApiError } from '../api/client';

export interface ErrorDescription {
  title: string;
  detail: string;
}

/** Turns any thrown value into words a user can act on. */
export function describeError(error: unknown): ErrorDescription {
  if (error instanceof ApiError) {
    if (error.status === null) {
      return {
        title: 'Can’t reach the server',
        detail: 'Check your connection, or that the API is running, then try again.',
      };
    }
    if (error.status >= 500) {
      return {
        title: 'The server ran into a problem',
        detail: 'We retried a few times without luck. This is usually temporary.',
      };
    }
    if (error.status === 404) {
      return { title: 'Not found', detail: error.message };
    }
    // Other 4xx: the API's own message says what was wrong with the request.
    return { title: 'The request was rejected', detail: error.message };
  }
  return {
    title: 'Something went wrong',
    detail: error instanceof Error ? error.message : 'Unexpected error.',
  };
}
