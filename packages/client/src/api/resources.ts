import type {
  Resource,
  FetchResourcesOptions,
  ResolvedFilterOptions,
  PaginationResult
} from '../types';

import {
  type ClientFailure,
  type ClientSuccess,
  AnimeGardenError,
  toClientFailure
} from '../error';
import { stringifyURLSearch } from '../resolver';
import { DefaultPageSize, MaxRequestPageSize } from '../constants';

import {
  isPaginationPayload,
  normalizeResolvedFilterPayload,
  normalizeResourcePayload
} from './validation';
import { fetchAPI } from './base';
import { toRequestError } from './request-error';

export type { PaginationResult } from '../types';

export interface ResourcesData<T extends FetchResourcesOptions> {
  resources: Resource<T>[];
  pagination: PaginationResult;
  filter: ResolvedFilterOptions;
  timestamp: Date;
}

export type FetchResourcesResult<T extends FetchResourcesOptions> =
  | ClientSuccess<ResourcesData<T>>
  | (ClientFailure & {
      resources: Resource<T>[];
      pagination: PaginationResult | undefined;
      filter: ResolvedFilterOptions | undefined;
      timestamp: Date | undefined;
    });

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
  let timestamp: Date | undefined = undefined;
  let pagination: PaginationResult | undefined = undefined;
  let filter: ResolvedFilterOptions | undefined = undefined;
  let failure: ClientFailure | undefined;

  for (let page = startPage; map.size < count && !pagination?.complete; page++) {
    if (options.signal?.aborted) {
      failure = toClientFailure(
        toRequestError('Request aborted', options.signal.reason, options.signal)
      );
      break;
    }

    let resp: Awaited<ReturnType<typeof fetchPage<T>>>;
    try {
      resp = await fetchPage(page, searchParams, options);
    } catch (currentError) {
      failure = toClientFailure(currentError);
      break;
    }

    timestamp ??= resp.timestamp;
    pagination = resp.pagination;
    filter = resp.filter;

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

    // Progress callbacks are application code; their exceptions must remain visible to callers.
    await options.progress?.(newRes, {
      url: searchParams.toString(),
      searchParams,
      page
    });

    if (once) {
      break;
    }
  }

  if (!failure) {
    return {
      ok: true,
      resources: uniq([...map.values()]),
      pagination: pagination as PaginationResult,
      filter: filter as ResolvedFilterOptions,
      timestamp: timestamp as Date
    };
  }

  return {
    ...failure,
    resources: uniq([...map.values()]),
    pagination,
    filter,
    timestamp
  };
}

async function fetchPage<T extends FetchResourcesOptions = FetchResourcesOptions>(
  page: number,
  searchParams: URLSearchParams,
  options: T
) {
  searchParams.set('page', '' + page);

  const r = await fetchAPI<any>('resources?' + searchParams.toString(), undefined, options);
  if (
    r &&
    typeof r === 'object' &&
    !Array.isArray(r) &&
    r.timestamp instanceof Date &&
    Array.isArray(r.resources) &&
    r.resources.every(normalizeResourcePayload) &&
    isPaginationPayload(r.pagination) &&
    normalizeResolvedFilterPayload(r.filter)
  ) {
    return {
      resources: r.resources as Resource<T>[],
      pagination: r.pagination,
      filter: r.filter,
      timestamp: r.timestamp
    };
  } else {
    throw AnimeGardenError.fromInvalidResponse(
      `Invalid response /resources?${searchParams.toString()}`,
      r
    );
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
