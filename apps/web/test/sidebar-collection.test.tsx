// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { expect, it, vi } from 'vitest';

import { CollectionItemContent } from '../src/layouts/Sidebar/Collection';

vi.mock('~/stores/hooks', () => ({ useAppStores: () => ({}) }));
// Show the tooltip content without coupling link assertions to Radix hover/portal behavior.
vi.mock('~/components/ui/tooltip', () => {
  const Content = ({ children }: { children: ReactNode }) => children;
  return {
    Tooltip: Content,
    TooltipProvider: Content,
    TooltipTrigger: Content,
    TooltipContent: Content
  };
});

it('builds sidebar fansub links through the router without interpreting names as query parameters', async () => {
  const fansubs = ['A&B=合集', '字幕组 + #?'];
  const item = { name: '字幕组', fansubs, searchParams: '' };
  const collection = { name: '收藏夹', authorization: '', filters: [item] };
  const queryClient = new QueryClient();
  const root = createRootRoute({ component: Outlet });
  const index = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <CollectionItemContent collection={collection} item={item} active={false} />
  });
  const resources = createRoute({ getParentRoute: () => root, path: '/resources' });
  const router = createRouter({
    routeTree: root.addChildren([index, resources]),
    history: createMemoryHistory({ initialEntries: ['/'] })
  });
  try {
    await router.load();
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );
    const container = document.createElement('div');
    container.innerHTML = html;
    const links = [...container.querySelectorAll<HTMLAnchorElement>('a.select-text')];
    expect(links).toHaveLength(fansubs.length);
    links.forEach((link, index) => {
      const url = new URL(link.getAttribute('href')!, 'https://animes.garden');
      expect(url.pathname).toBe('/resources');
      expect([...url.searchParams]).toEqual([['fansub', fansubs[index]]]);
      expect(url.hash).toBe('');
    });
  } finally {
    queryClient.clear();
  }
});
