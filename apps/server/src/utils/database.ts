import { retryFn } from '@animegarden/shared';

const NON_RETRYABLE_DATABASE_ERROR_CODES = new Set(['55P03', '57014']);

const NON_RETRYABLE_DATABASE_ERROR_MESSAGES = [
  'statement timeout',
  'lock timeout',
  'idle-in-transaction timeout',
  'idle in transaction timeout'
];

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  cause?: unknown;
};

function isErrorLike(error: unknown): error is ErrorLike {
  return typeof error === 'object' && error !== null;
}

function isNonRetryableDatabaseError(error: unknown) {
  let current = error;
  while (isErrorLike(current)) {
    const code = typeof current.code === 'string' ? current.code : undefined;
    if (code && NON_RETRYABLE_DATABASE_ERROR_CODES.has(code)) {
      return true;
    }

    const message = typeof current.message === 'string' ? current.message.toLowerCase() : '';
    if (NON_RETRYABLE_DATABASE_ERROR_MESSAGES.some((pattern) => message.includes(pattern))) {
      return true;
    }

    current = current.cause;
  }

  return false;
}

export function shouldRetryDatabaseError(error: unknown) {
  return !isNonRetryableDatabaseError(error);
}

export interface DatabaseRetryOptions {
  count: number;

  signal?: AbortSignal;
}

export function retryDatabaseFn<T>(fn: () => Promise<T>, options: DatabaseRetryOptions) {
  return retryFn(fn, {
    ...options,
    shouldRetry: shouldRetryDatabaseError
  });
}
