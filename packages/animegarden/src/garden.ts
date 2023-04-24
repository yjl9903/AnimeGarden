import type { Resource, ResourceDetail } from './types';

import { retryFn } from './utils';

export interface FetchResourcesOptions {
  baseURL?: string;

  fansub?: string;

  publisher?: string;

  type?: string;

  before?: Date;

  after?: Date;

  search?: {
    include?: string | (string | string[])[];
    exclude?: string[];
  };

  /**
   * Query the specified page
   */
  page?: number;

  /**
   * Query count resources
   */
  count?: number;

  /**
   * The number of retry
   */
  retry?: number;
}

export interface FetchResourceDetailOptions {
  baseURL?: string;

  /**
   * The number of retry
   */
  retry?: number;
}

/**
 * Fetch resources data from dmhy mirror site
 */
export async function fetchResources(
  fetch: (request: RequestInfo, init?: RequestInit) => Promise<Response>,
  options: FetchResourcesOptions = {}
) {
  const { baseURL = 'https://garden.onekuma.cn/api/', retry = 1 } = options;

  const url = new URL(options.search ? 'resources/search' : 'resources', baseURL);
  if (options.fansub) {
    url.searchParams.set('fansub', '' + options.fansub);
  }
  if (options.publisher) {
    url.searchParams.set('publisher', '' + options.publisher);
  }
  if (options.type) {
    url.searchParams.set('type', '' + options.type);
  }
  if (options.before) {
    url.searchParams.set('before', '' + options.before.getTime());
  }
  if (options.after) {
    url.searchParams.set('after', '' + options.after.getTime());
  }

  if (options.count) {
    const map = new Map<string, Resource>();
    let timestamp = new Date(0);
    for (let page = 1; map.size < options.count; page++) {
      const resp = await fetchPage(page);
      timestamp = resp.timestamp;
      for (const r of resp.resources) {
        map.set(r.href, r);
      }
    }
    return {
      resources: [...map.values()].sort((lhs, rhs) => rhs.createdAt.localeCompare(lhs.createdAt)),
      timestamp
    };
  } else {
    return fetchPage(options.page ?? 1);
  }

  async function fetchPage(page: number) {
    url.searchParams.set('page', '' + page);
    if (options.search) {
      return await retryFn(
        () =>
          fetch(url.toString(), {
            method: 'POST',
            body: JSON.stringify(options.search),
            headers: {
              'Content-Type': 'application/json'
            }
          })
            .then((r) => r.json())
            .then((r) => ({
              resources: r.resources as Resource[],
              timestamp: new Date(r.timestamp)
            })),
        retry
      );
    } else {
      return await retryFn(
        () =>
          fetch(url.toString())
            .then((r) => r.json())
            .then((r) => ({
              resources: r.resources as Resource[],
              timestamp: new Date(r.timestamp)
            })),
        retry
      );
    }
  }
}

export async function fetchResourceDetail(
  fetch: (request: RequestInfo, init?: RequestInit) => Promise<Response>,
  href: string,
  options: FetchResourceDetailOptions = {}
): Promise<ResourceDetail> {
  const { baseURL = 'https://garden.onekuma.cn/api/', retry = 1 } = options;
  const url = new URL('resource/' + href, baseURL);

  return await retryFn(
    () =>
      fetch(url.toString())
        .then((r) => r.json())
        .then((r) => r.detail),
    retry
  );
}
