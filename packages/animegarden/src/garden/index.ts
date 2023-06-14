import type { Resource, ResourceDetail } from '../types';

import type {
  ResolvedFilterOptions,
  FetchResourcesOptions,
  FetchResourceDetailOptions
} from './types';
import { stringifySearchURL } from './url';

import { retryFn } from './utils';

export * from './url';

export * from './types';

export { normalizeTitle } from './utils';

export const DefaultBaseURL = 'https://garden.onekuma.cn/api/';

/**
 * Fetch resources data from dmhy mirror site
 */
export async function fetchResources(
  fetch: (request: RequestInfo, init?: RequestInit) => Promise<Response>,
  options: FetchResourcesOptions = {}
): Promise<{ resources: Resource[]; filter?: ResolvedFilterOptions; timestamp: Date }> {
  const { baseURL = DefaultBaseURL, retry = 1 } = options;

  const url = stringifySearchURL(baseURL, options);

  if (options.count !== undefined && options.count !== null) {
    // Prefer the original count or -1 for inf
    const count = options.count < 0 ? Number.MAX_SAFE_INTEGER : options.count;

    const map = new Map<string, Resource>();
    let timestamp = new Date(0);
    let filter: ResolvedFilterOptions | undefined = undefined;

    for (let page = 1; map.size < count; page++) {
      try {
        const resp = await fetchPage(page);
        timestamp = resp.timestamp;
        if (resp.filter) {
          filter = resp.filter;
        }

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
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          break;
        } else {
          throw error;
        }
      }
    }

    return {
      resources: uniq([...map.values()]),
      filter,
      timestamp
    };
  } else {
    const r = await fetchPage(options.page ?? 1);
    const resources = uniq(r.resources);
    await options.progress?.(resources, { url: url.toString(), page: 1, timestamp: r.timestamp });

    return {
      resources,
      filter: r.filter,
      timestamp: r.timestamp
    };
  }

  async function fetchPage(page: number) {
    url.searchParams.set('page', '' + page);
    return await retryFn(
      () =>
        fetch(url.toString(), { signal: options.signal })
          .then((r) => r.json())
          .then((r) => ({
            resources: r.resources as Resource[],
            filter: r.filter as ResolvedFilterOptions | undefined,
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
  const { baseURL = DefaultBaseURL, retry = 1 } = options;
  const url = new URL('resource/' + href, baseURL);

  return await retryFn(
    () =>
      fetch(url.toString(), { signal: options.signal })
        .then((r) => r.json())
        .then((r) => r.detail),
    retry
  );
}
