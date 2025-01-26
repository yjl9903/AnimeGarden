import type { Resource, ResourceDetail } from './types';

import { version } from '../package.json';

import type {
  ResolvedFilterOptions,
  FetchResourcesOptions,
  FetchResourceDetailOptions
} from './filter';
import type { ProviderType } from './constants';

import { retryFn } from './utils';
import { stringifyURLSearch } from './resolver';

const DefaultBaseURL = 'https://garden.breadio.wiki/api/';

interface FetchResourcesResult<T extends FetchResourcesOptions> {
  ok: boolean;
  resources: Resource<T>[];
  complete: boolean;
  filter: Omit<ResolvedFilterOptions, 'page'> | undefined;
  timestamp: Date | undefined;
}

interface FetchResourceDetailResult {
  ok: boolean;
  resource: Resource[];
  timestamp: Date | undefined;
}

/**
 * Fetch resources data from dmhy mirror site
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
    let timestamp = new Date(0);
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
    }, retry).catch(() => undefined);
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

export async function fetchResourceDetail(
  provider: ProviderType,
  href: string,
  options: FetchResourceDetailOptions = {}
): Promise<FetchResourceDetailResult | undefined> {
  const { fetch = global.fetch } = options;
  const { baseURL = DefaultBaseURL, retry = 0 } = options;
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
      const json = await resp.json();
      // TODO: merge body
      return json;
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
