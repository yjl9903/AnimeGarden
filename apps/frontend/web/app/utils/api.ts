import { APP_HOST, SERVER_URL } from '~build/env';

import {
  type Collection,
  type ProviderType,
  type FilterOptions,
  type FetchResourcesOptions,
  fetchAPI as rawFetchAPI,
  fetchResources as rawFetchResources,
  fetchResourceDetail as rawFetchResourceDetail,
  fetchCollection as rawFetchCollection,
  generateCollection as rawGenerateCollection
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
  const timeout = 10 * 1000;

  try {
    const resp = await rawFetchAPI<T>(path, request, {
      fetch: ofetch,
      baseURL,
      retry: 0,
      signal: AbortSignal.timeout(timeout)
    } as const);
    return resp;
  } catch (error) {
    console.error('[API]', 'fetchAPI', path, error);

    return undefined;
  }
}

let lastTimestamp!: Date;

export async function fetchTimestamp(): Promise<{ timestamp?: string | undefined }> {
  try {
    const resp = await fetchAPI<{ timestamp: string }>('/', undefined);
    if (resp && resp.timestamp) {
      lastTimestamp = new Date(resp.timestamp);

      return {
        timestamp: resp.timestamp
      };
    }
  } catch (error) {
    console.error('[API]', 'fetchTimestamp', error);
  }

  return {
    timestamp: lastTimestamp.toISOString()
  };
}

export async function fetchResources(
  filter: FilterOptions = {},
  options: {
    fetch?: typeof ofetch;
    signal?: AbortSignal;
    timeout?: number;
    retry?: number;
  } = {}
) {
  const timeout = options.timeout ?? 30 * 1000;

  try {
    const resp = await rawFetchResources<FetchResourcesOptions & { tracker: true; metadata: true }>(
      {
        fetch: options.fetch ?? ofetch,
        baseURL,
        timeout,
        signal: options.signal,
        retry: options.retry ?? 1,
        ...filter,
        tracker: true,
        metadata: true
      } as const
    );

    if (resp?.timestamp) {
      lastTimestamp = resp.timestamp;
    } else if (resp) {
      resp.timestamp = lastTimestamp;
    }

    return resp;
  } catch (error) {
    console.error('[API]', 'fetchResources', filter, error);

    return {
      ok: false,
      resources: [],
      complete: false,
      filter: undefined,
      timestamp: lastTimestamp
    };
  }
}

export async function fetchResourceDetail(provider: string, href: string) {
  const timeout = 30 * 1000;

  try {
    const resp = await rawFetchResourceDetail(provider as ProviderType, href, {
      fetch: ofetch,
      baseURL,
      retry: 0,
      timeout
    });

    if (resp?.timestamp) {
      lastTimestamp = resp.timestamp;
    } else if (resp) {
      resp.timestamp = lastTimestamp;
    }

    return resp;
  } catch (error) {
    console.error('[API]', 'fetchResourceDetail', provider, href, error);

    return {
      ok: false,
      resource: undefined,
      detail: undefined,
      timestamp: lastTimestamp
    };
  }
}

export async function fetchCollection(hash: string) {
  const timeout = 30 * 1000;

  try {
    const resp = await rawFetchCollection(hash, {
      fetch: ofetch,
      baseURL,
      retry: 0,
      timeout
    });

    if (resp?.timestamp) {
      lastTimestamp = resp.timestamp;
    } else if (resp) {
      resp.timestamp = lastTimestamp;
    }

    return resp;
  } catch (error) {
    console.error('[API]', 'fetchCollection', hash, error);

    return undefined;
  }
}

export async function generateCollection(collection: Collection<true>) {
  try {
    return await rawGenerateCollection(collection, {
      fetch: ofetch,
      baseURL,
      retry: 0,
    });
  } catch (error) {
    console.error('[API]', 'generateCollection', collection, error);

    return null;
  }
}
