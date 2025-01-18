import { APP_HOST, SERVER_HOST, SERVER_PORT, SERVER_PROTOCOL, SERVER_BASE } from '~build/env';

import {
  type ProviderType,
  type FilterOptions,
  fetchResources as rawFetchResources,
  fetchResourceDetail as rawFetchResourceDetail,
  FetchResourcesOptions
} from 'animegarden';

export const baseURL = import.meta.env.SSR
  ? SERVER_HOST
    ? `${SERVER_PROTOCOL || 'http'}://${SERVER_HOST}${SERVER_PORT ? ':' + SERVER_PORT : ''}${SERVER_BASE}`
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

export async function fetchResources(
  filter: FilterOptions = {},
  options: {
    fetch?: typeof ofetch;
    signal?: AbortSignal;
    retry?: number;
  } = {}
) {
  try {
    const resp = await rawFetchResources<FetchResourcesOptions & { tracker: true }>(
      options.fetch ?? ofetch,
      {
        baseURL,
        signal: options.signal,
        retry: options.retry,
        ...filter,
        tracker: true
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
    return await rawFetchResourceDetail(ofetch, provider as ProviderType, href, {
      baseURL
    });
  } catch (error) {
    console.error(error);
    return undefined;
  }
}