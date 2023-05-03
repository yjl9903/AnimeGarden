import type { Resource, ResourceDetail, ResourceType } from './types';

import { retryFn } from './utils';

export interface FetchResourcesOptions {
  /**
   * The base URL of anime garden API
   *
   * @default 'https://garden.onekuma.cn/api/'
   */
  baseURL?: string;

  /**
   * Filter by the group id of fansub
   */
  fansub?: string;

  /**
   * Filter by the user id of publisher
   */
  publisher?: string;

  /**
   * Filter by the resource type
   *
   * @type ResourceType
   */
  type?: string;

  /**
   * Resources uploaded before the specified date
   */
  before?: Date;

  /**
   * Resources uploaded after the specified date
   */
  after?: Date;

  /**
   * Search in titles, it must contains at least one word in each of the include array,
   * and should not contain any excluded word
   */
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
   * The number of retry times
   */
  retry?: number;

  /**
   * Progress callback when querying multiple pages
   */
  progress?: (
    delta: Resource[],
    payload: { url: string; page: number; timestamp: Date }
  ) => void | Promise<void>;
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
  if (options.search) {
    url.searchParams.set('include', JSON.stringify(options.search.include ?? []));
    url.searchParams.set('exclude', JSON.stringify(options.search.exclude ?? []));
  }

  if (options.count !== undefined && options.count !== null) {
    // Prefer the original count or -1 for inf
    const count = options.count < 0 ? Number.MAX_SAFE_INTEGER : options.count;

    const map = new Map<string, Resource>();
    let timestamp = new Date(0);
    for (let page = 1; map.size < count; page++) {
      const resp = await fetchPage(page);
      timestamp = resp.timestamp;
      if (resp.resources.length === 0) {
        break;
      }
      const newRes = [];
      for (const r of resp.resources) {
        if (!map.has(r.href)) {
          map.set(r.href, r);
          newRes.push(r);
        }
      }
      await options.progress?.(newRes, { url: url.toString(), page, timestamp });
    }

    return {
      resources: uniq([...map.values()]),
      timestamp
    };
  } else {
    const r = await fetchPage(options.page ?? 1);
    const resources = uniq(r.resources);
    await options.progress?.(resources, { url: url.toString(), page: 1, timestamp: r.timestamp });

    return {
      resources,
      timestamp: r.timestamp
    };
  }

  async function fetchPage(page: number) {
    url.searchParams.set('page', '' + page);
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

  function uniq(resources: Resource[]) {
    const map = new Map<string, Resource>();
    for (const r of resources) {
      if (!map.has(r.href)) {
        map.set(r.href, r);
      }
    }
    return [...map.values()].sort((lhs, rhs) => rhs.createdAt.localeCompare(lhs.createdAt));
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
