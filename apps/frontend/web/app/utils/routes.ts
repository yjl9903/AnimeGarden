import { Location } from '@remix-run/react';

import { Collection } from '~/states/collection';

export function getActivePageTab(location: Location, collection: Collection) {
  const pathname = location.pathname;
  if (pathname.startsWith('/resources/')) {
    for (const item of collection.items) {
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
