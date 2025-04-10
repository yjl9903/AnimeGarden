import { version } from '../package.json';

import type { FetchOptions, ProviderType } from './types';

import { retryFn } from './utils';
import { DefaultBaseURL } from './constants';

export async function fetchAPI<T>(
  path: string,
  init: RequestInit | undefined = undefined,
  options: FetchOptions = {}
): Promise<T> {
  const { fetch = global.fetch, baseURL = DefaultBaseURL, retry = 0 } = options;

  const url = new URL(path.replace(/^\/+/g, ''), baseURL);

  // @ts-ignore
  const headers = new Headers(options.headers);
  if (!headers.get('user-agent')) {
    headers.set(`user-agent`, `animegarden@${version}`);
  }

  return await retryFn<T>(async () => {
    const resp = await fetch(url.toString(), {
      ...init,
      headers,
      signal: options.signal
    });
    if (resp.ok) {
      return await resp.json() as T;
    } else {
      throw new Error(`Failed fetching ${url.toString()}`, { cause: resp });
    }
  }, retry);
}

export async function fetchStatus(options: FetchOptions = {}) {
  const resp = await fetchAPI<{
    timestamp: string;
    providers: Record<
      ProviderType,
      { id: ProviderType; name: string; refreshedAt: string; isActive: boolean }
    >;
  }>('/', undefined, options);

  return {
    timestamp: resp.timestamp,
    providers: resp.providers
  };
}
