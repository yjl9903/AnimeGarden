import { Location } from '@remix-run/react';

import type { Collection } from '@animegarden/client';

export function getActivePageTab(location: Location, collection: Collection) {
  const pathname = location.pathname;
  if (pathname.startsWith('/resources/')) {
    for (const item of collection.filters) {
      if (location.search === item.searchParams) {
        return item.searchParams;
      }
    }
    return 'resources';
  }
  if (pathname === '/' || pathname === '') {
    return 'index';
  }
}
