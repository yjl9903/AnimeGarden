// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
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

const { fetchResourcesFn, setCacheControl, setErrorResponse } = vi.hoisted(() => ({
  fetchResourcesFn: vi.fn(),
  setCacheControl: vi.fn(),
  setErrorResponse: vi.fn()
}));
vi.mock('~/query/proxy', () => ({ fetchResourcesFn }));
vi.mock('~/utils/response', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/response')>()),
  setCacheControl,
  setErrorResponse
}));
vi.mock('~/layouts/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => children
}));
vi.mock('~/pages/subject.$subject.($page)/subject', () => ({
  SubjectCard: () => null
}));
vi.mock('../src/routeTree.gen', () => ({ routeTree: {} }));

import { loader, Route } from '../src/routes/subject/$subject/route';
import { subjectQueryOptions } from '../src/query/subject';
import { parseRouterSearch, stringifyRouterSearch } from '../src/router';

it('shows one grouped batch and keeps title links without scroll loading or extra buttons', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const observe = vi.fn();
  vi.stubGlobal('IntersectionObserver', observe);
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const timestamp = new Date('2026-07-01');
  const resource = {
    id: 1,
    provider: 'dmhy',
    providerId: '1',
    title: 'Episode 01',
    href: 'https://example.com/1',
    type: '动画',
    magnet: 'magnet:?xt=urn:btih:1',
    tracker: '',
    size: 1024,
    publisher: { id: 1, name: 'Publisher / Name' },
    createdAt: timestamp,
    fetchedAt: timestamp
  };
  const response = {
    ok: true,
    resources: [
      { ...resource, fansub: { id: 2, name: 'Fansub & Name' } },
      { ...resource, id: 2, providerId: '2', title: 'Episode 02' }
    ],
    pagination: { anchor: timestamp.getTime(), limit: 1000, nextCursor: 'next', complete: false },
    filter: { subjects: [42], types: ['动画', '合集'] },
    timestamp,
    error: undefined
  };
  fetchResourcesFn.mockResolvedValue(response);
  const queryClient = new QueryClient();
  queryClient.setQueryData(subjectQueryOptions(42).queryKey, {
    ok: true,
    subject: {
      id: 42,
      title: 'Subject',
      search: { include: [] },
      platform: 'TV',
      poster: '',
      summary: '',
      alias: {},
      tags: []
    }
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  try {
    const data = await loader({
      context: { queryClient },
      location: { href: 'http://localhost/subject/42', searchStr: '' },
      params: { subject: '42' }
    });
    expect(fetchResourcesFn).toHaveBeenCalledOnce();
    expect(fetchResourcesFn.mock.calls[0][0].data.filter).toEqual({
      subject: 42,
      limit: 1000,
      types: ['动画', '合集'],
      cursor: undefined
    });
    const rootRoute = createRootRoute({ component: Outlet });
    const subjectRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/subject/$subject',
      loader: () => data,
      component: Route.options.component
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([subjectRoute]),
      parseSearch: parseRouterSearch,
      stringifySearch: stringifyRouterSearch,
      history: createMemoryHistory({ initialEntries: ['/subject/42'] })
    });
    await router.load();
    await act(async () =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      )
    );

    const titles = [...container.querySelectorAll<HTMLAnchorElement>('h2 a.text-link-active')];
    expect(titles).toHaveLength(2);
    for (const title of titles) {
      const url = new URL(title.href);
      expect(url.pathname).toBe('/resources');
      expect(url.searchParams.get('subject')).toBe('42');
      expect(url.searchParams.has('cursor')).toBe(false);
      const isFansub = title.textContent === 'Fansub & Name';
      expect(url.searchParams.get(isFansub ? 'fansub' : 'publisher')).toBe(title.textContent);
    }
    expect(container.textContent).toContain('Episode 01');
    expect(container.textContent).toContain('Episode 02');
    expect(container.textContent).not.toContain('全部资源');
    expect(container.querySelector('[aria-busy]')).toBeNull();
    expect(observe).not.toHaveBeenCalled();
    await act(async () => window.dispatchEvent(new Event('scroll')));
    expect(fetchResourcesFn).toHaveBeenCalledOnce();

    // The overview can refresh, but replaces the batch instead of appending a continuation.
    fetchResourcesFn.mockResolvedValue({
      ...response,
      resources: [{ ...resource, id: 3, providerId: '3', title: 'Episode 03' }]
    });
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['api', 'resources'] });
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(fetchResourcesFn).toHaveBeenCalledTimes(2);
    expect(fetchResourcesFn.mock.calls[1][0].data.filter.cursor).not.toBe('next');
    expect(container.textContent).toContain('Episode 03');
    expect(container.textContent).not.toContain('Episode 01');
    expect(observe).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    queryClient.clear();
    container.remove();
    scroll.mockRestore();
    vi.unstubAllGlobals();
  }
});
