export interface RetryOptions {
  count: number;

  signal?: AbortSignal;

  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export async function retryFn<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { signal, shouldRetry } = options;
  let { count } = options;

  if (count < 0) {
    count = Number.MAX_SAFE_INTEGER;
  }
  let e: unknown;
  for (let i = 0; i <= count; i++) {
    try {
      return await fn();
    } catch (err) {
      e = err;
      if (signal?.aborted) {
        break;
      }
      if (shouldRetry && !shouldRetry(err, i + 1)) {
        break;
      }
    }
  }
  throw e;
}

export function sleep(timeout?: number) {
  return new Promise<void>((res) => {
    setTimeout(() => res(), timeout);
  });
}
