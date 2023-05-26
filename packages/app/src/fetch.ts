import {
  fetchResources as rawFetchResources,
  fetchResourceDetail as rawFetchResourceDetail
} from 'animegarden';

import { WORKER_BASE } from './constant';

const ofetch = async (url: string | RequestInfo, init?: RequestInit) => {
  if (import.meta.env.DEV && import.meta.env.HTTPS_PROXY) {
    const { ProxyAgent } = await import('undici');
    return fetch(url, {
      ...init,
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
  page: number,
  options: {
    include?: (string | string[])[];
    exclude?: string[];
    fansub?: number;
    publisher?: number;
    type?: string;
    after?: Date;
    before?: Date;
    signal?: AbortSignal;
  } = {}
) {
  return (
    await rawFetchResources(ofetch, {
      baseURL: 'https://' + WORKER_BASE,
      page,
      search: options.include
        ? {
            include: options.include,
            exclude: options.exclude
          }
        : undefined,
      fansub: options.fansub ? '' + options.fansub : undefined,
      publisher: options.publisher ? '' + options.publisher : undefined,
      type: options.type ? '' + options.type : undefined,
      after: options.after,
      before: options.before,
      signal: options.signal
    })
  ).resources;
}

export async function fetchResourceDetail(href: string) {
  try {
    return await rawFetchResourceDetail(ofetch, href, {
      baseURL: 'https://' + WORKER_BASE
    });
  } catch (error) {
    console.error(error);
    return undefined;
  }
}
