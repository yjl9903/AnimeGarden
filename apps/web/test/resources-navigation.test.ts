// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { stringifyURLSearch } from '@animegarden/client';

import { loader, Route } from '../src/routes/resources/index';
import type { ResourcesQueryInput } from '../src/query/animegarden';
import { getFeedURL } from '../src/utils/url';
import { getResourcesRouteLink } from '../src/utils/routes';

const { fetchResourcesFn } = vi.hoisted(() => ({ fetchResourcesFn: vi.fn() }));
vi.mock('~/query/proxy', () => ({ fetchResourcesFn }));

vi.mock('~/pages/resources.($page)/route', () => ({
  default: () => null
}));
vi.mock('~/utils/response', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/response')>()),
  setCacheControl: vi.fn(),
  setErrorResponse: vi.fn()
}));

describe('resources navigation loader cache', () => {
  it.each([
    { key: 'type', first: '动画', second: '合集', field: 'types' },
    { key: 'fansub', first: '字幕组 A', second: '字幕组 B', field: 'fansubs' }
  ])(
    'keeps $key filters current after Header-style preloading and navigation',
    async ({ key, first, second, field }) => {
      // Use the real loader and its cache dependencies, replacing only the remote query results.
      const queryClient = new QueryClient();
      fetchResourcesFn.mockImplementation(
        async ({ data }: { data: { filter: ResourcesQueryInput } }) => {
          const { cursor, limit, ...filter } = data.filter;
          return {
            ok: true,
            resources: [],
            filter,
            pagination: { anchor: 0, limit, nextCursor: null, complete: true },
            timestamp: new Date(0)
          };
        }
      );
      const root = createRootRouteWithContext<{ queryClient: QueryClient }>()();
      const resources = createRoute({
        getParentRoute: () => root,
        path: '/resources',
        loaderDeps: ({ search }) => Route.options.loaderDeps!({ search }),
        loader
      });
      const router = createRouter({
        routeTree: root.addChildren([resources]),
        context: { queryClient },
        history: createMemoryHistory({
          initialEntries: [`/resources?${new URLSearchParams({ [key]: first })}`]
        })
      });

      await router.load();
      const firstMatch = router.state.matches.at(-1)!;
      expect(firstMatch.loaderData).toMatchObject({ filter: { [field]: [first] } });

      const destination = {
        to: '/resources' as const,
        search: { [key]: second }
      };
      await router.preloadRoute(destination);
      await router.navigate(destination);

      const secondMatch = router.state.matches.at(-1)!;
      expect(new URL(router.state.location.href, 'https://example.com').searchParams.get(key)).toBe(
        second
      );
      expect(secondMatch.id).not.toBe(firstMatch.id);
      expect(secondMatch.loaderData).toMatchObject({ filter: { [field]: [second] } });

      // RSS and resource navigation retain the selected filter.
      const { filter } = secondMatch.loaderData as {
        filter: Parameters<typeof stringifyURLSearch>[0];
      };
      const search = `?${stringifyURLSearch(filter)}`;
      expect(new URL(getFeedURL(search)).searchParams.get(key)).toBe(second);
      expect(getResourcesRouteLink(search)).toMatchObject({
        to: '/resources',
        search: { [key]: second }
      });

      // Returning to the previous tab must select its own loader data too.
      await router.navigate({ ...destination, search: { [key]: first } });
      expect(router.state.matches.at(-1)!.loaderData).toMatchObject({
        filter: { [field]: [first] }
      });
      queryClient.clear();
    }
  );
});
