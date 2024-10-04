import { Location } from '@remix-run/react';

export function getActivePageTab(location: Location) {
  const pathname = location.pathname;
  if (pathname.startsWith('/resources/')) {
    return 'resources';
  }
  if (pathname === '/' || pathname === '') {
    return 'index';
  }
}
