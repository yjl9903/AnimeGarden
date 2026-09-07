import { retryFn, sleep } from '@animegarden/shared';

import type { FetchOptions } from '../types';

import { AnimeGardenError } from '../error';
import { version, DefaultBaseURL } from '../constants';

import { getRequestErrorCode, toRequestError } from './request-error';

export type FetchAPIResult<T> = T extends Record<string, any> ? T & { timestamp?: Date } : T;

function parseTimestamp(value: unknown): Date | undefined {
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

  if (typeof value !== 'string') {
    return undefined;
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

      if (signal?.aborted) {
        throw toRequestError('Request aborted', signal.reason, signal);
      }

      const payload = {
        ...init,
        headers,
        signal
      };

      if (options?.hooks?.prefetch) {
        await options.hooks.prefetch(url.toString(), payload);
      }

      // An asynchronous prefetch hook may finish after the request has been cancelled.
      if (signal?.aborted) {
        throw toRequestError('Request aborted', signal.reason, signal);
      }

      let error: unknown;
      const resp = await fetch(url.toString(), payload).catch((fetchError: unknown) => {
        error = fetchError;
        return undefined;
      });

      if (resp) {
        if (options?.hooks?.postfetch) {
          await options.hooks.postfetch(url.toString(), payload, resp);
        }

        if (resp.ok) {
          // Body transfer can fail after headers arrive; keep those failures separate from JSON syntax.
          let body: string;
          try {
            body = await resp.text();
          } catch (error) {
            throw toRequestError(`Failed reading response ${url.toString()}`, error, signal, {
              response: resp
            });
          }

          if (signal?.aborted) {
            throw toRequestError('Request aborted', signal.reason, signal, { response: resp });
          }

          let data: T;
          try {
            data = JSON.parse(body) as T;
          } catch (error) {
            throw AnimeGardenError.fromInvalidResponse(
              `Invalid JSON response ${url.toString()}`,
              error,
              resp
            );
          }

          if (
            data &&
            typeof data === 'object' &&
            'status' in data &&
            (data as Record<string, unknown>).status === 'ERROR'
          ) {
            throw AnimeGardenError.fromInvalidResponse(
              `API returned an error payload with HTTP ${resp.status} ${url.toString()}`,
              data,
              resp
            );
          }

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
          const responseError = await AnimeGardenError.fromResponse(
            `${resp.status} ${resp.statusText} ${url.toString()}`,
            resp
          );

          // Reading an HTTP error body may consume an abort exception; preserve caller cancellation.
          if (
            signal?.aborted &&
            !(resp.status === 429 && getRequestErrorCode(signal.reason, signal) === 'TIMEOUT')
          ) {
            throw toRequestError('Request aborted', signal.reason, signal, {
              response: resp,
              body: responseError.body
            });
          }

          // Preserve the received 429 even when the per-request timeout interrupts backoff.
          if (resp.status === 429) {
            try {
              await sleep(16 * 1000, { signal });
            } catch (backoffError) {
              if (getRequestErrorCode(backoffError, signal) === 'TIMEOUT') {
                throw responseError;
              }
              throw toRequestError(
                'Request aborted during rate-limit backoff',
                backoffError,
                signal
              );
            }
          }
          throw responseError;
        }
      } else {
        if (getRequestErrorCode(error, signal) === 'TIMEOUT') {
          if (options.hooks?.timeout) {
            await options.hooks.timeout(signal);
          } else if (!signal?.aborted) {
            try {
              await sleep(100, { signal });
            } catch (waitError) {
              throw toRequestError('Request aborted during timeout delay', waitError, signal);
            }
          }
        }

        // Abort reasons can be arbitrary values, including objects that cannot be stringified.
        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : `Request failed ${url.toString()}`;
        throw toRequestError(message, error, signal);
      }
    },
    {
      count: retry,
      signal: options.signal
    }
  );
}
