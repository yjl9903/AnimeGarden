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
  it.each([
    { complete: true, empty: false },
    { complete: true, empty: true },
    { complete: false, empty: false }
  ])(
    'renders an unboxed group with complete=$complete and empty=$empty',
    async ({ complete, empty }) => {
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
            pagination: {
              anchor: Date.parse('2026-01-02T03:04:05Z'),
              limit: 30,
              nextCursor: complete ? null : 'next',
              complete
            },
            filter: { types: ['动画'] }
          }
        ]
      };
      if (empty) data.results[0].resources = [];
      const root = createRootRoute({ component: Outlet });
      const collection = createRoute({
        getParentRoute: () => root,
        path: '/collection/$hash',
        component: () => <Collections data={data} />
      });
      const resources = createRoute({
        getParentRoute: () => root,
        path: '/resources'
      });
      const router = createRouter({
        routeTree: root.addChildren([collection, resources]),
        history: createMemoryHistory({ initialEntries: ['/collection/abc'] })
      });
      await router.load();

      const html = renderToStaticMarkup(<RouterProvider router={router} />);

      expect(html.includes('Episode 01')).toBe(!empty);
      expect(html).toContain('class="flex flex-col gap-12"');
      expect(html).toContain('<section><div class="mb-4 pb-4 border-b pl-4 lt-sm:pl-2">');
      expect(html).not.toContain('class="px-4"');
      expect(html).not.toContain('class="py-4"');
      expect(html).not.toContain('drop-md');
      expect(html.includes('→ 全部资源')).toBe(!complete);
      if (!complete) {
        expect(html).toContain('class="mt-6 flex justify-end"');
        expect(html).toMatch(/href="\/resources\?[^"\s]+"/);
      }
    }
  );
});
