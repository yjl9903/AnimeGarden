import type { Resource, ResolvedFilterOptions, FetchResourcesOptions } from '../types';

import { stringifyURLSearch } from '../resolver';

import { fetchAPI } from './base';

export interface FetchResourcesResult<T extends FetchResourcesOptions> {
  ok: boolean;
  resources: Resource<T>[];
  complete: boolean;
  filter: Omit<ResolvedFilterOptions, 'page'> | undefined;
  timestamp: Date | undefined;
}

/**
 * Fetch resources list data from anime garden
 */
export async function fetchResources<T extends FetchResourcesOptions = FetchResourcesOptions>(
  options: T = {} as T
): Promise<FetchResourcesResult<T>> {
  const searchParams = stringifyURLSearch(options);

  // Enable tracker
  if (options.tracker) {
    searchParams.set('tracker', 'true');
  }
  if (options.metadata) {
    searchParams.set('metadata', 'true');
  }

  if (options.count !== undefined && options.count !== null) {
    // Fetch multiple pages
    searchParams.set('pageSize', '1000');

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
          url: searchParams.toString(),
          searchParams,
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
      url: searchParams.toString(),
      searchParams,
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
    searchParams.set('page', '' + page);

    const r = await fetchAPI<any>('resources?' + searchParams.toString(), undefined, options);

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
      throw new Error(`Invalid response /resource?${searchParams.toString()}`);
    }
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
