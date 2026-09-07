import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';

import type { CollectionData } from '@animegarden/client';

import Collections from '../src/pages/collection.$hash/route';

vi.mock('~/layouts/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => children
}));

vi.mock('~/layouts/Sidebar/Collection', () => ({
  useInferCollectionItemName: () => ({ text: 'Latest' })
}));

describe('collection page pagination', () => {
  it.each([true, false])(
    'renders resource navigation from pagination.complete=%s',
    async (complete) => {
      const data: CollectionData = {
        hash: 'abc',
        name: 'My Collection',
        createdAt: '2026-01-02T03:04:05Z',
        timestamp: new Date('2026-01-02T03:04:05Z'),
        filters: [{ name: 'Latest', searchParams: 'type=动画', types: ['动画'] }],
        results: [
          {
            resources: [
              {
                id: 1,
                provider: 'dmhy',
                providerId: '123',
                title: 'Episode 01',
                href: 'https://example.com/resource',
                type: '动画',
                magnet: 'magnet:?xt=urn:btih:test',
                tracker: '',
                size: 1024,
                publisher: { id: 2, name: 'Publisher' },
                createdAt: new Date('2026-01-02T03:04:05Z'),
                fetchedAt: new Date('2026-01-02T03:04:05Z')
              }
            ],
            pagination: { page: 3, pageSize: 30, complete },
            filter: { types: ['动画'] }
          }
        ]
      };
      const root = createRootRoute({ component: Outlet });
      const collection = createRoute({
        getParentRoute: () => root,
        path: '/collection/$hash',
        component: () => <Collections data={data} />
      });
      const resources = createRoute({
        getParentRoute: () => root,
        path: '/resources/$page'
      });
      const router = createRouter({
        routeTree: root.addChildren([collection, resources]),
        history: createMemoryHistory({ initialEntries: ['/collection/abc'] })
      });
      await router.load();

      const html = renderToStaticMarkup(<RouterProvider router={router} />);

      expect(html).toContain('Episode 01');
      expect(html.includes('下一页')).toBe(!complete);
      expect(html.includes('上一页')).toBe(!complete);
      if (!complete) {
        expect(html).toMatch(/href="\/resources\/4\?[^"\s]+"[^>]*><span>下一页<\/span>/);
        expect(html).toMatch(/href="\/resources\/2\?[^"\s]+"[^>]*><span>上一页<\/span>/);
      }
    }
  );
});
