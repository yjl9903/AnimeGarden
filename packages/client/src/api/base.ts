import { retryFn, sleep } from '@animegarden/shared';

import { version } from '../../package.json';

import type { FetchOptions } from '../types';

import { DefaultBaseURL } from '../constants';

export async function fetchAPI<T>(
  path: string,
  init: RequestInit | undefined = undefined,
  options: FetchOptions = {}
): Promise<T> {
  const { fetch = globalThis.fetch, baseURL = DefaultBaseURL, retry = 0 } = options;

  const url = new URL(path.replace(/^\/+/g, ''), baseURL);

  // @ts-ignore
  const headers = new Headers(options.headers);
  if (!headers.get('user-agent')) {
    headers.set(`user-agent`, `animegarden@${version}`);
  }

  return await retryFn<T>(async () => {
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

    const resp = await fetch(url.toString(), payload);

    if (options?.hooks?.postfetch) {
      await options.hooks.postfetch(url.toString(), payload, resp);
    }

    if (resp.ok) {
      return (await resp.json()) as T;
    } else {
      // 429 TOO MANY REQUEST
      if (resp.status === 429) {
        await sleep(16 * 1000);
      }

      throw new Error(`${resp.status} ${resp.statusText} ${url.toString()}`, { cause: resp });
    }
  }, retry);
}
