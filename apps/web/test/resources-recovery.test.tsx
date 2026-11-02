// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider
} from '@tanstack/react-query';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { expect, it, vi } from 'vitest';

const { fetchResourcesFn, fetchTimestampFn, setErrorResponse } = vi.hoisted(() => ({
  fetchResourcesFn: vi.fn(),
  fetchTimestampFn: vi.fn(),
  setErrorResponse: vi.fn()
}));
vi.mock('~/query/proxy', () => ({ fetchResourcesFn, fetchTimestampFn }));
vi.mock('~/utils/response', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/response')>()),
  setCacheControl: vi.fn(),
  setErrorResponse
}));
vi.mock('~/pages/resources.($page)/route', () => ({
  default: ({
    data
  }: {
    data: { ok: boolean; resources: Array<{ title: string }>; error?: { message: string } };
  }) =>
    data.ok ? (
      <>
        <div>{data.resources.map((resource) => resource.title).join(',')}</div>
        {data.error && <div role="alert">{data.error.message}</div>}
      </>
    ) : (
      <div>offline</div>
    )
}));

import { loader, Route } from '../src/routes/resources/index';
import { resourcesListQueryOptions, timestampQueryOptions } from '../src/query/animegarden';

it.each(['focus', 'reconnect', 'poll', 'cache'])(
  'keeps a failed first batch subscribed and recovers through %s',
  async (trigger) => {
    vi.clearAllMocks();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const client = new QueryClient();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const anchor = Date.parse('2026-07-01');
    const filter = { limit: 30 };
    const options = resourcesListQueryOptions(filter);

    try {
      fetchResourcesFn.mockResolvedValueOnce({
        ok: false,
        resources: [],
        pagination: undefined,
        filter: undefined,
        error: { name: 'Error', message: 'offline' }
      });
      const data = await loader({
        context: { queryClient: client },
        location: { href: 'http://localhost/resources' }
      });
      expect(data.pagination).toBeUndefined();
      expect(setErrorResponse).toHaveBeenCalledWith(500);

      const rootRoute = createRootRoute({ component: Outlet });
      const resources = createRoute({
        getParentRoute: () => rootRoute,
        path: '/resources',
        component: Outlet
      });
      const index = createRoute({
        getParentRoute: () => resources,
        path: '/',
        loader: () => data,
        component: Route.options.component
      });
      const router = createRouter({
        routeTree: rootRoute.addChildren([resources.addChildren([index])]),
        history: createMemoryHistory({ initialEntries: ['/resources'] })
      });
      await router.load();
      await act(async () =>
        root.render(
          <QueryClientProvider client={client}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        )
      );
      expect(container.textContent).toBe('offline');
      expect(client.getQueryCache().find({ queryKey: options.queryKey })!.isActive()).toBe(true);
      expect(fetchResourcesFn).toHaveBeenCalledOnce();

      const response = {
        ok: true as const,
        resources: [],
        pagination: { anchor, limit: 30, nextCursor: null, complete: true },
        filter: {},
        timestamp: new Date(anchor),
        error: undefined
      };
      // The transport payload includes one visible row; cache-only recovery can use an empty batch.
      fetchResourcesFn.mockResolvedValue({
        ...response,
        resources: [{ title: 'Recovered episode' }]
      });
      fetchTimestampFn.mockResolvedValue({ ok: true, timestamp: new Date(anchor) });
      await act(async () => {
        if (trigger === 'cache') {
          client.setQueryData(options.queryKey, { pages: [response], pageParams: [undefined] });
        } else {
          await client.invalidateQueries({ queryKey: options.queryKey, refetchType: 'none' });
          if (trigger === 'focus') {
            focusManager.setFocused(false);
            focusManager.setFocused(true);
          } else if (trigger === 'reconnect') {
            onlineManager.setOnline(false);
            onlineManager.setOnline(true);
          } else {
            await client.query({ ...timestampQueryOptions(), staleTime: 0 });
          }
          await vi.waitFor(() => expect(fetchResourcesFn).toHaveBeenCalledTimes(2));
          await vi.waitFor(() => expect(client.isFetching({ queryKey: options.queryKey })).toBe(0));
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      expect(container.textContent).not.toContain('offline');
      if (trigger !== 'cache') expect(container.textContent).toContain('Recovered episode');
      // No navigation or loader rerun was needed to leave the initial error state.
      expect(router.state.location.pathname).toBe('/resources');
      expect(fetchResourcesFn).toHaveBeenCalledTimes(trigger === 'cache' ? 1 : 2);
    } finally {
      await act(async () => root.unmount());
      client.clear();
      container.remove();
      focusManager.setFocused(undefined);
      onlineManager.setOnline(true);
      visibility.mockRestore();
      scroll.mockRestore();
      log.mockRestore();
      vi.unstubAllGlobals();
    }
  }
);

it('navigates back to a cached list during an outage and keeps its query subscribed', async () => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const client = new QueryClient();
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const anchor = Date.parse('2026-07-01');
  const options = resourcesListQueryOptions({ limit: 30 });
  const response = {
    ok: true,
    resources: [{ title: 'Cached episode' }],
    pagination: { anchor, limit: 30, nextCursor: null, complete: true },
    filter: {},
    timestamp: new Date(anchor),
    error: undefined
  };
  try {
    fetchResourcesFn.mockResolvedValue(response);
    await loader({
      context: { queryClient: client },
      location: { href: 'http://localhost/resources' }
    });
    const before = client.getQueryData(options.queryKey);
    await client.invalidateQueries({ queryKey: options.queryKey, refetchType: 'none' });
    fetchResourcesFn.mockResolvedValue({
      ok: false,
      resources: [],
      error: { message: 'offline' }
    });

    const rootRoute = createRootRoute({ component: Outlet });
    const other = createRoute({ getParentRoute: () => rootRoute, path: '/other' });
    const resources = createRoute({
      getParentRoute: () => rootRoute,
      path: '/resources',
      component: Outlet
    });
    const index = createRoute({
      getParentRoute: () => resources,
      path: '/',
      loader: ({ location }) => loader({ context: { queryClient: client }, location }),
      component: Route.options.component
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([other, resources.addChildren([index])]),
      history: createMemoryHistory({ initialEntries: ['/other'] })
    });
    await router.load();
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      )
    );
    await act(async () => {
      await router.navigate({ to: '/resources' });
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(router.state.matches.find((match) => match.routeId === '/resources/')?.status).toBe(
      'success'
    );
    expect(container.textContent).toContain('Cached episode');
    expect(container.querySelector('[role=alert]')?.textContent).toBe('offline');
    expect(client.getQueryData(options.queryKey)).toBe(before);
    expect(client.getQueryCache().find({ queryKey: options.queryKey })!.isActive()).toBe(true);

    fetchResourcesFn.mockResolvedValue({
      ...response,
      resources: [{ title: 'Recovered episode' }]
    });
    await act(async () => {
      await client.invalidateQueries({ queryKey: options.queryKey });
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(container.textContent).toContain('Recovered episode');
    expect(container.querySelector('[role=alert]')).toBeNull();
  } finally {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    scroll.mockRestore();
    vi.unstubAllGlobals();
  }
});
