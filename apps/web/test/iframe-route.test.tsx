// @vitest-environment jsdom
import { act } from 'react';
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
import { beforeEach, expect, it, vi } from 'vitest';
import { DefaultResourcesLimit } from '@animegarden/client';

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

import { loader, Route } from '../src/routes/iframe';

beforeEach(() => vi.clearAllMocks());

it('renders a single static iframe batch without observing or refetching the resource list', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const observe = vi.fn();
  vi.stubGlobal('IntersectionObserver', observe);
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const timestamp = new Date('2026-07-01');
  fetchResourcesFn.mockResolvedValue({
    ok: true,
    resources: [
      {
        id: 1,
        provider: 'dmhy',
        providerId: '1',
        title: 'Episode 01',
        href: 'https://example.com/1',
        type: '动画',
        magnet: 'magnet:?xt=urn:btih:1',
        tracker: '',
        size: 1024,
        publisher: { id: 1, name: 'Publisher' },
        createdAt: timestamp,
        fetchedAt: timestamp
      }
    ],
    pagination: { anchor: timestamp.getTime(), limit: 1, nextCursor: 'next', complete: false },
    filter: { types: ['动画'] },
    timestamp,
    error: undefined
  });
  const queryClient = new QueryClient();
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    const href =
      'http://localhost/iframe?type=动画&cursor=ignored&limit=1&className=frame&style=padding:4px';
    const data = await loader({ context: { queryClient }, location: { href } });
    expect(fetchResourcesFn).toHaveBeenCalledOnce();
    expect(fetchResourcesFn.mock.calls[0][0].data.filter).toEqual({
      types: ['动画'],
      limit: 1,
      cursor: undefined
    });
    const rootRoute = createRootRoute({ component: Outlet });
    const iframe = createRoute({
      getParentRoute: () => rootRoute,
      path: '/iframe',
      loader: () => data,
      component: Route.options.component
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([iframe]),
      history: createMemoryHistory({ initialEntries: ['/iframe' + new URL(href).search] })
    });
    await router.load();
    await act(async () =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      )
    );

    expect(container.textContent).toContain('Episode 01');
    expect(container.querySelector<HTMLElement>('.frame')!.style.padding).toBe('4px');
    expect(container.querySelector('[aria-busy]')).toBeNull();
    expect(observe).not.toHaveBeenCalled();
    expect(setCacheControl).toHaveBeenCalled();
    expect(setErrorResponse).not.toHaveBeenCalled();

    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: ['api', 'resources'],
        refetchType: 'active'
      });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(fetchResourcesFn).toHaveBeenCalledOnce();
    expect(observe).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    queryClient.clear();
    container.remove();
    scroll.mockRestore();
    vi.unstubAllGlobals();
  }
});

it.each([undefined, '50', '100'])(
  'uses the requested limit %s or the API default',
  async (limit) => {
    const expected = limit === undefined ? DefaultResourcesLimit : Number(limit);
    const queryClient = new QueryClient();
    fetchResourcesFn.mockResolvedValue({
      ok: true,
      resources: [],
      pagination: { anchor: 0, limit: expected, nextCursor: null, complete: true },
      filter: {},
      timestamp: new Date(0),
      error: undefined
    });
    try {
      await loader({
        context: { queryClient },
        location: { href: `http://localhost/iframe${limit === undefined ? '' : `?limit=${limit}`}` }
      });
      expect(fetchResourcesFn).toHaveBeenCalledOnce();
      expect(fetchResourcesFn.mock.calls[0][0].data.filter.limit).toBe(expected);
    } finally {
      queryClient.clear();
    }
  }
);

it('includes limit changes in loader dependencies while ignoring cursor state', () => {
  const deps = (limit: string) =>
    Route.options.loaderDeps!({
      search: { type: '动画', limit, cursor: 'ignored' }
    } as never);
  expect(deps('1')).toEqual({ type: '动画', limit: '1' });
  expect(deps('50')).toEqual({ type: '动画', limit: '50' });
});
