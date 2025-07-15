import type { Resource, FetchResourcesOptions, ResolvedFilterOptions } from '../types';

import { stringifyURLSearch } from '../resolver';

import { fetchAPI } from './base';
import { DefaultPageSize, MaxRequestPageSize } from '../constants';

type PaginationResponse = {
  page: number;
  pageSize: number;
  complete: boolean;
};

export type PaginationResult = {
  page: number;
  pageSize: number;
  complete: boolean;
};

export type FetchResourcesResult<T extends FetchResourcesOptions> =
  | {
      ok: true;
      resources: Resource<T>[];
      pagination: PaginationResult;
      filter: ResolvedFilterOptions;
      timestamp: Date;
      error: Error | any | undefined;
    }
  | {
      ok: false;
      resources: Resource<T>[];
      pagination: PaginationResult | undefined;
      filter: ResolvedFilterOptions | undefined;
      timestamp: Date | undefined;
      error: Error | any | undefined;
    };

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
  // Enable metadata
  if (options.metadata) {
    searchParams.set('metadata', 'true');
  }

  const {
    once, // Only fetch one page
    count // Fetch resources count
  } =
    options.count !== undefined && options.count !== null
      ? // Prefer the original count or -1 for inf
        { count: options.count < 0 ? Number.MAX_SAFE_INTEGER : options.count, once: false }
      : { count: options.pageSize ?? DefaultPageSize, once: true };

  const startPage = options.page ?? 1;

  // Fetch multiple pages
  if (!once) {
    searchParams.set('pageSize', '' + MaxRequestPageSize);
  }

  const map = new Map<string, Resource<T>>();
  let aborted = false;
  let timestamp: Date | undefined = undefined;
  let pagination: PaginationResponse | undefined = undefined;
  let filter: ResolvedFilterOptions | undefined = undefined;
  let error: Error | any | undefined = undefined;

  for (let page = startPage; map.size < count && !pagination?.complete; page++) {
    try {
      if (options.signal?.aborted) {
        aborted = true;
        break;
      }

      const resp = await fetchPage(page, searchParams, options);
      if (!resp) {
        aborted = true;
        break;
      }

      if (!timestamp) {
        timestamp = resp.timestamp;
      }
      if (resp.pagination) {
        pagination = resp.pagination;
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
    } catch (currentError) {
      if (
        currentError instanceof Error &&
        (currentError.name === 'AbortError' || currentError.name === 'TimeoutError')
      ) {
        aborted = true;
        error = currentError;
        break;
      } else {
        error = currentError;
      }
    }

    if (once) {
      break;
    }
  }

  if (!aborted) {
    return {
      ok: true,
      resources: uniq([...map.values()]),
      pagination: pagination as PaginationResult,
      filter: filter as ResolvedFilterOptions,
      timestamp: timestamp as Date,
      error
    };
  } else {
    return {
      ok: false,
      resources: uniq([...map.values()]),
      pagination,
      filter,
      timestamp,
      error
    };
  }
}

async function fetchPage<T extends FetchResourcesOptions = FetchResourcesOptions>(
  page: number,
  searchParams: URLSearchParams,
  options: T
) {
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
      pagination: r.pagination as PaginationResponse | undefined,
      filter: r.filter as ResolvedFilterOptions | undefined,
      timestamp
    };
  } else {
    throw new Error(`Invalid response /resource?${searchParams.toString()}`, { cause: r });
  }
}

function uniq<T extends FetchResourcesOptions = FetchResourcesOptions>(resources: Resource<T>[]) {
  const map = new Map<string, Resource<T>>();
  for (const r of resources) {
    if (!map.has(r.href)) {
      map.set(r.href, r);
    }
  }
  return [...map.values()].sort((lhs, rhs) => rhs.createdAt.getTime() - lhs.createdAt.getTime());
}
