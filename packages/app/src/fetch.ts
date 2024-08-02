import { APP_HOST, SERVER_HOST, SERVER_PORT, SERVER_PROTOCOL, SERVER_BASE } from '~build/meta';

import {
  type ProviderType,
  type FilterOptions,
  fetchResources as rawFetchResources,
  fetchResourceDetail as rawFetchResourceDetail
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

export const wfetch = (fn?: Fetcher): typeof ofetch => {
  if (fn) {
    return async (url: string | RequestInfo, init?: RequestInit) => {
      try {
        const resp = await fn.fetch(url, init);
        return resp;
      } catch (error) {
        console.error(error);
        if (error instanceof Error) {
          if (error.stack) {
            console.log(...error.stack.split('\n'));
          }
        }
        return ofetch(url, init);
      }
    };
  } else {
    return ofetch;
  }
};

export async function fetchResources(
  filter: FilterOptions = {},
  options: {
    fetch?: typeof ofetch;
    signal?: AbortSignal;
  } = {}
) {
  return await rawFetchResources(options.fetch ?? ofetch, {
    baseURL,
    tracker: true,
    signal: options.signal,
    ...filter
  });
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
