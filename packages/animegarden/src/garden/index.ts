import type { Resource, ResourceDetail, ResourceWithId } from '../types';

import { version } from '../../package.json';

import type {
  ResolvedFilterOptions,
  FetchResourcesOptions,
  FetchResourceDetailOptions,
  ProviderType
} from './types';

import { retryFn } from './utils';
import { stringifySearchURL } from './url';

export * from './url';

export * from './types';

export { normalizeTitle, retryFn } from './utils';

export { makeResourcesFilter } from './filter';

export { AllFansubs, findFansub } from './constant';

export const DefaultBaseURL = 'https://garden.breadio.wiki/api/';

interface FetchResourcesResult<T extends FetchResourcesOptions> {
  ok: boolean;
  resources: ResourceWithId<T>[];
  complete: boolean;
  filter?: Omit<ResolvedFilterOptions, 'page'>;
  timestamp?: Date;
}

/**
 * Fetch resources data from dmhy mirror site
 */
export async function fetchResources<T extends FetchResourcesOptions = FetchResourcesOptions>(
  fetch: (request: RequestInfo, init?: RequestInit) => Promise<Response>,
  options: T = {} as T
): Promise<FetchResourcesResult<FetchResourcesOptions>> {
  const { baseURL = DefaultBaseURL, retry = 1 } = options;

  const url = stringifySearchURL(baseURL, options);

  // Enable tracker
  if (options.tracker) {
    url.searchParams.set('tracker', 'true');
  }

  if (options.count !== undefined && options.count !== null) {
    // Fetch multiple pages

    // Prefer the original count or -1 for inf
    const count = options.count < 0 ? Number.MAX_SAFE_INTEGER : options.count;

    const map = new Map<string, ResourceWithId<T>>();
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

    if (!resp || !resp.resources) {
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
      // @ts-ignore
      const headers = new Headers(options.headers);
      if (!headers.get('user-agent')) {
        headers.set(`user-agent`, `animegarden@${version}`);
      }

      const resp = await fetch(url.toString(), {
        headers,
        signal: options.signal
      });
      if (resp.ok) {
        const r = await resp.json();
        const timestamp = new Date(r.timestamp);
        if (!isNaN(timestamp.getTime())) {
          return {
            resources: r.resources as ResourceWithId<T>[],
            complete: r.complete as boolean,
            filter: r.filter as ResolvedFilterOptions | undefined,
            timestamp
          };
        }
      }
      return undefined;
    }, retry);
  }

  function uniq(resources: ResourceWithId<T>[]) {
    const map = new Map<string, ResourceWithId<T>>();
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
  provider: ProviderType,
  href: string,
  options: FetchResourceDetailOptions = {}
): Promise<(ResourceDetail & { id: number }) | undefined> {
  const { baseURL = DefaultBaseURL, retry = 1 } = options;
  const url = new URL(`${provider}/detail/${href}`, baseURL);

  const resp = await retryFn(async () => {
    // @ts-ignore
    const headers = new Headers(options.headers);
    if (!headers.get('user-agent')) {
      headers.set(`user-agent`, `animegarden@${version}`);
    }

    const resp = await fetch(url.toString(), {
      signal: options.signal
    });
    if (resp.ok) {
      return await resp.json();
    } else {
      throw new Error(`Fetch failed`, { cause: resp });
    }
  }, retry);

  if (resp.id !== undefined && resp.detail !== undefined) {
    return { id: resp.id, ...resp.detail };
  } else {
    return undefined;
  }
}
