import type {
  Resource,
  FetchResourcesOptions,
  ResolvedFilterOptions,
  CursorPagination
} from '../types';

import {
  type ClientFailure,
  type ClientSuccess,
  AnimeGardenError,
  toClientFailure
} from '../error';
import { parseURLSearch, stringifyURLSearch } from '../resolver';
import { DefaultResourcesLimit, MaxResourcesLimit } from '../constants';

import {
  isPaginationPayload,
  normalizeResolvedFilterPayload,
  normalizeResourcePayload
} from './validation';
import { fetchAPI } from './base';
import { toRequestError } from './request-error';

export type { CursorPagination } from '../types';

export interface ResourcesData<T extends FetchResourcesOptions> {
  resources: Resource<T>[];
  pagination: CursorPagination;
  filter: ResolvedFilterOptions;
  timestamp: Date;
}

export type FetchResourcesResult<T extends FetchResourcesOptions> =
  | ClientSuccess<ResourcesData<T>>
  | (ClientFailure & {
      resources: Resource<T>[];
      pagination: CursorPagination | undefined;
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
    once, // Only fetch one batch
    count // Fetch resources count
  } =
    options.count !== undefined && options.count !== null
      ? // Prefer the original count or -1 for inf
        { count: options.count < 0 ? Number.MAX_SAFE_INTEGER : options.count, once: false }
      : { count: parseURLSearch(undefined, options).pagination.limit, once: true };

  const map = new Map<string, Resource<T>>();
  let timestamp: Date | undefined = undefined;
  let pagination: CursorPagination | undefined = undefined;
  let filter: ResolvedFilterOptions | undefined = undefined;
  let failure: ClientFailure | undefined;
  let cursor = options.cursor;

  const seenCursors = new Set<string>();
  if (cursor) seenCursors.add(cursor);

  // Even count=0 fetches metadata so success always includes validated pagination and filters.
  while ((!pagination || map.size < count) && !pagination?.complete) {
    if (options.signal?.aborted) {
      failure = toClientFailure(
        toRequestError('Request aborted', options.signal.reason, options.signal)
      );
      break;
    }

    let resp: Awaited<ReturnType<typeof fetchBatch<T>>>;
    try {
      const requestedLimit =
        options.limit === undefined
          ? once
            ? DefaultResourcesLimit
            : MaxResourcesLimit
          : parseURLSearch(undefined, options).pagination.limit;
      const limit =
        once || count === 0
          ? requestedLimit
          : Math.max(1, Math.min(requestedLimit, count - map.size));
      searchParams.set('limit', String(limit));
      if (cursor) {
        searchParams.set('cursor', cursor);
      }
      resp = await fetchBatch(searchParams, options);
      if (pagination && resp.pagination.anchor !== pagination.anchor) {
        throw AnimeGardenError.fromInvalidResponse('Resource anchor changed between batches', resp);
      }
      if (resp.pagination.nextCursor && seenCursors.has(resp.pagination.nextCursor)) {
        throw AnimeGardenError.fromInvalidResponse('Resource cursor did not advance', resp);
      }
    } catch (currentError) {
      failure = toClientFailure(currentError);
      break;
    }

    timestamp ??= resp.timestamp;
    pagination = resp.pagination;
    filter = resp.filter;

    if (count === 0) break;

    const newRes = [];
    for (const r of resp.resources) {
      if (!map.has(r.href)) {
        map.set(r.href, r);
        newRes.push(r);
      }
    }

    // Progress callbacks are application code; their exceptions must remain visible to callers.
    await options.progress?.(newRes, {
      anchor: resp.pagination.anchor,
      cursor
    });

    if (once || count === 0) {
      break;
    }
    cursor = resp.pagination.nextCursor ?? undefined;
    if (cursor) seenCursors.add(cursor);
  }

  if (!failure) {
    return {
      ok: true,
      resources: uniq([...map.values()]).slice(0, count),
      pagination: pagination as CursorPagination,
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

async function fetchBatch<T extends FetchResourcesOptions = FetchResourcesOptions>(
  searchParams: URLSearchParams,
  options: T
) {
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
