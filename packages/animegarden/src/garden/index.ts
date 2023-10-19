import type { Resource, ResourceDetail } from '../types';

import type {
  ResolvedFilterOptions,
  FetchResourcesOptions,
  FetchResourceDetailOptions
} from './types';

import { retryFn } from './utils';
import { stringifySearchURL } from './url';

export * from './url';

export * from './types';

export { normalizeTitle } from './utils';

export { makeResourcesFilter } from './filter';

export { AllFansubs, findFansub } from './constant';

export const DefaultBaseURL = 'https://garden.onekuma.cn/api/';

type ResourceWithId = Resource & { id: number };

interface FetchResourcesResult {
  ok: boolean;
  resources: ResourceWithId[];
  complete: boolean;
  filter?: Omit<ResolvedFilterOptions, 'page'>;
  timestamp?: Date;
}

/**
 * Fetch resources data from dmhy mirror site
 */
export async function fetchResources(
  fetch: (request: RequestInfo, init?: RequestInit) => Promise<Response>,
  options: FetchResourcesOptions = {}
): Promise<FetchResourcesResult> {
  const { baseURL = DefaultBaseURL, retry = 1 } = options;

  const url = stringifySearchURL(baseURL, options);

  if (options.count !== undefined && options.count !== null) {
    // Fetch multiple pages

    // Prefer the original count or -1 for inf
    const count = options.count < 0 ? Number.MAX_SAFE_INTEGER : options.count;

    const map = new Map<string, ResourceWithId>();
    let aborted = false;
    let timestamp = new Date(0);
    let complete = false;
    let filter: Omit<ResolvedFilterOptions, 'page'> | undefined = undefined;

    for (let page = 1; map.size < count; page++) {
      try {
        if (options.signal?.aborted) {
          aborted = true;
          break;
        }

        const resp = await fetchPage(page);
        if (!resp) {
          aborted = true;
          break;
        }

        timestamp = resp.timestamp;
        complete = resp.complete;
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
        await options.progress?.(newRes, {
          url: url.toString(),
          page,
          timestamp
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          aborted = true;
          break;
        } else {
          throw error;
        }
      }
    }

    if (filter && 'page' in filter) {
      delete filter['page'];
    }

    return {
      ok: !aborted,
      resources: uniq([...map.values()]),
      complete: aborted ? false : complete,
      filter,
      timestamp
    };
  } else {
    // Fetch one page
    const resp = await fetchPage(options.page ?? 1);

    if (!resp) {
      return {
        ok: false,
        resources: [],
        complete: false,
        filter: undefined,
        timestamp: undefined
      };
    }

    const resources = uniq(resp.resources);
    await options.progress?.(resources, {
      url: url.toString(),
      page: 1,
      timestamp: resp.timestamp
    });

    return {
      ok: true,
      resources,
      complete: resp.complete ?? false,
      filter: resp.filter,
      timestamp: resp.timestamp
    };
  }

  async function fetchPage(page: number) {
    url.searchParams.set('page', '' + page);
    return await retryFn(async () => {
      const resp = await fetch(url.toString(), { signal: options.signal });
      if (resp.ok) {
        const r = await resp.json();
        return {
          resources: r.resources as ResourceWithId[],
          complete: r.complete as boolean,
          filter: r.filter as ResolvedFilterOptions | undefined,
          timestamp: new Date(r.timestamp)
        };
      } else {
        return undefined;
      }
    }, retry);
  }

  function uniq(resources: ResourceWithId[]) {
    const map = new Map<string, ResourceWithId>();
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
): Promise<(ResourceDetail & { id: number }) | undefined> {
  const { baseURL = DefaultBaseURL, retry = 1 } = options;
  const url = new URL('resource/' + href, baseURL);

  const resp = await retryFn(
    () => fetch(url.toString(), { signal: options.signal }).then((r) => r.json()),
    retry
  );

  if (resp.id !== undefined && resp.detail !== undefined) {
    return { id: resp.id, ...resp.detail };
  } else {
    return undefined;
  }
}
