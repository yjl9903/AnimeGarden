import type { ParsedLocation } from '@tanstack/react-router';

import { parseURLSearch, stringifyURLSearch } from '@animegarden/client';
import type { Collection, Jsonify, ResolvedFilterOptions } from '@animegarden/client';

export type RouterSearch = Record<string, string | string[]>;

/** Converts URL query params into TanStack Router search props. */
export function toRouterSearch(input: string | URLSearchParams | RouterSearch): RouterSearch {
  if (!(typeof input === 'string') && !(input instanceof URLSearchParams)) {
    return input;
  }

  const params =
    typeof input === 'string'
      ? new URLSearchParams(input.startsWith('?') ? input.slice(1) : input)
      : input;
  const search: RouterSearch = {};

  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    if (values.length === 1) {
      search[key] = values[0];
    } else if (values.length > 1) {
      search[key] = values;
    }
  }

  return search;
}

/** Keeps only resource-list query params understood by the API client. */
export function toResourcesRouterSearch(
  input: string | URLSearchParams | RouterSearch
): RouterSearch {
  const params = new URLSearchParams();
  if (typeof input === 'string') {
    const parsed = new URLSearchParams(input.startsWith('?') ? input.slice(1) : input);
    parsed.forEach((value, key) => params.append(key, value));
  } else if (input instanceof URLSearchParams) {
    input.forEach((value, key) => params.append(key, value));
  } else {
    for (const [key, value] of Object.entries(input)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        params.append(key, item);
      }
    }
  }

  // Browser routes represent filters only. Cursor state and batch limits stay inside query data.
  const { filter } = parseURLSearch(params);
  const searchParams = stringifyURLSearch(filter);

  return toRouterSearch(searchParams);
}

/** Refines a server-resolved filter without inheriting untrusted browser search state. */
export function toResourceRefineRouterSearch(
  filter: Jsonify<ResolvedFilterOptions> | ResolvedFilterOptions | undefined,
  refinements: Record<string, string>
) {
  const normalizedFilter = Object.fromEntries(
    Object.entries(filter ?? {}).filter(([, value]) => value != null)
  ) as ResolvedFilterOptions;
  const search = stringifyURLSearch(normalizedFilter);
  for (const [key, value] of Object.entries(refinements)) {
    search.delete(key);
    search.set(key, value);
  }
  return toResourcesRouterSearch(search);
}

/** Builds typed link props for the filter-only resources route. */
export function getResourcesRouteLink(search: string | URLSearchParams | RouterSearch = '') {
  return {
    to: '/resources' as const,
    search: toResourcesRouterSearch(search)
  };
}

/** Builds typed link props for a concrete calendar season. */
export function getCalendarRouteLink(season: string) {
  return {
    to: '/calendar/$season' as const,
    params: { season }
  };
}

export function getActivePageTab(
  location: Pick<ParsedLocation, 'pathname' | 'searchStr'>,
  collection: Collection
) {
  const pathname = location.pathname;
  if (pathname === '/resources' || pathname === '/resources/') {
    for (const item of collection.filters) {
      if (location.searchStr === item.searchParams) {
        return item.searchParams;
      }
    }
    return 'resources';
  }
  if (pathname === '/anime' || pathname.startsWith('/calendar/')) {
    return 'anime';
  }
  if (pathname === '/' || pathname === '') {
    return 'index';
  }
}
