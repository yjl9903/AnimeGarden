import { retryFn, sleep } from '@animegarden/shared';

import type { FetchOptions } from '../types';

import { version, DefaultBaseURL } from '../constants';

export type FetchAPIResult<T> = T extends Record<string, any> ? T & { timestamp?: Date } : T;

function parseTimestamp(value: Date | string | number | undefined | null): Date | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  const timestamp = value.trim();
  if (!timestamp) {
    return undefined;
  }

  const date = /^-?\d+$/.test(timestamp) ? new Date(Number(timestamp)) : new Date(timestamp);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function fetchAPI<T>(
  path: string,
  init: RequestInit | undefined = undefined,
  options: FetchOptions = {}
): Promise<FetchAPIResult<T>> {
  const { fetch = globalThis.fetch, baseURL = DefaultBaseURL, retry = 0 } = options;

  const url = new URL(path.replace(/^\/+/g, ''), baseURL);

  // @ts-ignore
  const headers = new Headers(options.headers);
  headers.set(`x-trace-id`, crypto.randomUUID());
  if (!headers.get('user-agent')) {
    headers.set(`user-agent`, `animegarden@${version}`);
  }

  return await retryFn<FetchAPIResult<T>>(
    async () => {
      const signal =
        options.timeout && options.timeout > 0
          ? options.signal
            ? AbortSignal.any([AbortSignal.timeout(options.timeout), options.signal])
            : AbortSignal.timeout(options.timeout)
          : options.signal;

      const payload = {
        ...init,
        headers,
        signal
      };

      if (options?.hooks?.prefetch) {
        await options.hooks.prefetch(url.toString(), payload);
      }

      let error: any;
      const resp = await fetch(url.toString(), payload).catch((_error) => {
        error = _error;
        return undefined;
      });

      if (resp) {
        if (options?.hooks?.postfetch) {
          await options.hooks.postfetch(url.toString(), payload, resp);
        }

        if (resp.ok) {
          const data = (await resp.json()) as T;
          const timestamp =
            parseTimestamp(resp.headers.get('x-response-timestamp')) ??
            parseTimestamp(
              data && typeof data === 'object' ? (data as Record<string, any>).timestamp : undefined
            );

          if (data && typeof data === 'object') {
            return Object.assign(data as object, { timestamp }) as FetchAPIResult<T>;
          }

          return data as FetchAPIResult<T>;
        } else {
          // 429 TOO MANY REQUEST
          if (resp.status === 429) {
            await sleep(16 * 1000);
          }
          throw new Error(`${resp.status} ${resp.statusText} ${url.toString()}`, { cause: resp });
        }
      } else {
        if (error?.name === 'AbortError') {
          throw error;
        }
        if (error?.name === 'TimeoutError') {
          await (options.hooks?.timeout ? options.hooks?.timeout() : sleep(100));
          throw error;
        }

        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error(error);
        }
      }
    },
    retry,
    options.signal
  );
}
