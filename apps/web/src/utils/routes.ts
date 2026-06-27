import type { ParsedLocation } from '@tanstack/react-router';

import type { Collection } from '@animegarden/client';

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

/** Builds typed link props for the paged resources route. */
export function getResourcesRouteLink(
  page: number,
  search: string | URLSearchParams | RouterSearch = ''
) {
  return {
    to: '/resources/$page' as const,
    params: { page: String(page) },
    search: toRouterSearch(search)
  };
}

export function getActivePageTab(
  location: Pick<ParsedLocation, 'pathname' | 'searchStr'>,
  collection: Collection
) {
  const pathname = location.pathname;
  if (pathname.startsWith('/resources/')) {
    for (const item of collection.filters) {
      if (location.searchStr === item.searchParams) {
        return item.searchParams;
      }
    }
    return 'resources';
  }
  if (pathname.startsWith('/anime/')) {
    return 'anime';
  }
  if (pathname === '/' || pathname === '') {
    return 'index';
  }
}
