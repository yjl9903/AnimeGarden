// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { stringifyURLSearch } from '@animegarden/client';

import { loader, Route } from '../src/routes/resources/$page';
import type { ResourcesQueryInput } from '../src/query/animegarden';
import { getFeedURL } from '../src/utils/url';
import { getResourcesRouteLink } from '../src/utils/routes';

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
      const ensureQueryData = vi.fn(async ({ queryKey }: { queryKey: readonly unknown[] }) => {
        if (queryKey[1] === 'calendar') return { ok: true, calendar: [] };
        if (queryKey[1] === 'resources') {
          const { page, pageSize, ...filter } = queryKey[2] as ResourcesQueryInput;
          return { ok: true, resources: [], filter };
        }
        throw new Error(`Unexpected query: ${queryKey.join('/')}`);
      });
      const root = createRootRouteWithContext<{ queryClient: QueryClient }>()();
      const resources = createRoute({
        getParentRoute: () => root,
        path: '/resources/$page',
        loaderDeps: ({ search }) => Route.options.loaderDeps!({ search }),
        loader
      });
      const router = createRouter({
        routeTree: root.addChildren([resources]),
        context: { queryClient: { ensureQueryData } as unknown as QueryClient },
        history: createMemoryHistory({
          initialEntries: [`/resources/1?${new URLSearchParams({ [key]: first })}`]
        })
      });

      await router.load();
      const firstMatch = router.state.matches.at(-1)!;
      expect(firstMatch.loaderData).toMatchObject({ filter: { [field]: [first] } });

      const destination = {
        to: '/resources/$page' as const,
        params: { page: '1' },
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

      // RSS and pagination use this normalized loader filter, not the live query's filter.
      const { filter } = secondMatch.loaderData as {
        filter: Parameters<typeof stringifyURLSearch>[0];
      };
      const search = `?${stringifyURLSearch(filter)}`;
      expect(new URL(getFeedURL(search)).searchParams.get(key)).toBe(second);
      expect(getResourcesRouteLink(2, search)).toMatchObject({
        params: { page: '2' },
        search: { [key]: second }
      });

      // Returning to the previous tab must select its own loader data too.
      await router.navigate({ ...destination, search: { [key]: first } });
      expect(router.state.matches.at(-1)!.loaderData).toMatchObject({
        filter: { [field]: [first] }
      });
    }
  );
});
