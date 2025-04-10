import { version } from '../package.json';

import type { Resource, ResourceDetail } from './types';

import type {
  ProviderType,
  ResolvedFilterOptions,
  FetchResourcesOptions,
  FetchResourceDetailOptions
} from './types';

import { retryFn } from './utils';
import { DefaultBaseURL } from './constants';
import { stringifyURLSearch } from './resolver';

export interface FetchResourcesResult<T extends FetchResourcesOptions> {
  ok: boolean;
  resources: Resource<T>[];
  complete: boolean;
  filter: Omit<ResolvedFilterOptions, 'page'> | undefined;
  timestamp: Date | undefined;
}

export interface FetchResourceDetailResult {
  ok: boolean;
  resource: Resource<{ tracker: true; metadata: true }> | undefined;
  detail: ResourceDetail | undefined;
  timestamp: Date | undefined;
}

/**
 * Fetch resources list data from anime garden
 */
export async function fetchResources<T extends FetchResourcesOptions = FetchResourcesOptions>(
  options: T = {} as T
): Promise<FetchResourcesResult<T>> {
  const { fetch = global.fetch } = options;
  const { baseURL = DefaultBaseURL, retry = 0 } = options;

  const searchParams = stringifyURLSearch(options);
  const url = new URL('resources', baseURL);
  url.search = searchParams.toString();

  // Enable tracker
  if (options.tracker) {
    url.searchParams.set('tracker', 'true');
  }
  if (options.metadata) {
    url.searchParams.set('metadata', 'true');
  }

  if (options.count !== undefined && options.count !== null) {
    // Fetch multiple pages
    url.searchParams.set('pageSize', '1000');

    // Prefer the original count or -1 for inf
    const count = options.count < 0 ? Number.MAX_SAFE_INTEGER : options.count;

    const map = new Map<string, Resource<T>>();
    let aborted = false;
    let timestamp!: Date;
    let complete = false;
    let filter: Omit<ResolvedFilterOptions, 'page'> | undefined = undefined;

    for (let page = 1; map.size < count && !complete; page++) {
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

        complete = resp.complete;
        if (!timestamp) {
          timestamp = resp.timestamp;
        }
        if (resp.filter) {
          filter = resp.filter;
        }

        // No new resources
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
          page
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

    if (filter) {
      // @ts-ignore
      delete filter['page'];
      // @ts-ignore
      delete filter['pageSize'];
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
      page: 1
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
        const r = await resp.json() as any;
        const timestamp = new Date(r.timestamp);
        if (!isNaN(timestamp.getTime())) {
          // --- Fix date type ---
          for (const res of r.resources) {
            res.createdAt = new Date(res.createdAt);
            res.fetchedAt = new Date(res.fetchedAt);
          }
          if (r.filter.before) {
            r.filter.before = new Date(r.filter.before);
          }
          if (r.filter.after) {
            r.filter.after = new Date(r.filter.after);
          }
          // ---------------------

          return {
            resources: r.resources as Resource<T>[],
            complete: r.complete as boolean,
            filter: r.filter as ResolvedFilterOptions | undefined,
            timestamp
          };
        } else {
          throw new Error(`Failed to connect ${baseURL}`);
        }
      }
    }, retry);
  }

  function uniq(resources: Resource<T>[]) {
    const map = new Map<string, Resource<T>>();
    for (const r of resources) {
      if (!map.has(r.href)) {
        map.set(r.href, r);
      }
    }
    return [...map.values()].sort((lhs, rhs) => rhs.createdAt.getTime() - lhs.createdAt.getTime());
  }
}

/**
 * Fetch resource detail from anime garden
 */
export async function fetchResourceDetail(
  provider: ProviderType,
  href: string,
  options: FetchResourceDetailOptions = {}
): Promise<FetchResourceDetailResult> {
  const { fetch = global.fetch } = options;
  const { baseURL = DefaultBaseURL, retry = 0 } = options;
  const url = new URL(`detail/${provider}/${href}`, baseURL);

  const resp = await retryFn(async () => {
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
      const json = await resp.json();
      return json as any;
    } else {
      throw new Error(`Fetch failed`, { cause: resp });
    }
  }, retry);

  return {
    ok: resp.resource !== undefined && resp.detail !== undefined && resp.timestamp !== undefined,
    resource: resp.resource,
    detail: resp.detail,
    timestamp: resp.timestamp
  };
}
