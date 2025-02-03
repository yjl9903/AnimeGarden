import { APP_HOST, SERVER_URL } from '~build/env';

import {
  type ProviderType,
  type FilterOptions,
  type FetchResourcesOptions,
  fetchAPI as rawFetchAPI,
  fetchResources as rawFetchResources,
  fetchResourceDetail as rawFetchResourceDetail
} from '@animegarden/client';

export const baseURL = import.meta.env.SSR
  ? SERVER_URL
    ? SERVER_URL
    : `https://${APP_HOST}/api/`
  : `https://${APP_HOST}/api/`;

export const ofetch = async (url: string | RequestInfo, init?: RequestInit) => {
  if (import.meta.env.DEV && import.meta.env.HTTPS_PROXY) {
    const { ProxyAgent } = await import('undici');
    return fetch(url, {
      ...init,
      referrer: `https://${APP_HOST}/`,
      // @ts-ignore
      dispatcher:
        import.meta.env.DEV && import.meta.env.HTTPS_PROXY
          ? new ProxyAgent(import.meta.env.HTTPS_PROXY)
          : undefined
    });
  } else {
    return fetch(url, init);
  }
};

export async function fetchAPI<T>(path: string, request: RequestInit | undefined) {
  try {
    const resp = await rawFetchAPI<T>(path, request, {
      fetch: ofetch,
      baseURL
    } as const);
    return resp;
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

export async function fetchTimestamp() {
  try {
    const resp = await fetchAPI<{ timestamp: string }>('/', undefined);
    return {
      timestamp: resp?.timestamp
    };
  } catch (error) {
    console.error(error);
    return {
      timestamp: undefined
    };
  }
}

export async function fetchResources(
  filter: FilterOptions = {},
  options: {
    fetch?: typeof ofetch;
    signal?: AbortSignal;
    retry?: number;
  } = {}
) {
  try {
    const resp = await rawFetchResources<FetchResourcesOptions & { tracker: true; metadata: true }>(
      {
        fetch: options.fetch ?? ofetch,
        baseURL,
        signal: options.signal,
        retry: options.retry,
        ...filter,
        tracker: true,
        metadata: true
      } as const
    );
    return resp;
  } catch (error) {
    console.error(error);

    return {
      ok: false,
      resources: [],
      complete: false,
      filter: undefined,
      timestamp: undefined
    };
  }
}

export async function fetchResourceDetail(provider: string, href: string) {
  try {
    return await rawFetchResourceDetail(provider as ProviderType, href, {
      fetch: ofetch,
      baseURL
    });
  } catch (error) {
    console.error(error);
    return undefined;
  }
}
