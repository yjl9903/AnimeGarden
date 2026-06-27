import type { ParsedLocation } from '@tanstack/react-router';

import type { Collection } from '@animegarden/client';

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
