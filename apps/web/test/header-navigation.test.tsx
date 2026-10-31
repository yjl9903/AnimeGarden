// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Header } from '../src/layouts/Header';

const { calendarQuery, preferredFansubs } = vi.hoisted(() => ({
  calendarQuery: vi.fn(),
  preferredFansubs: []
}));

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQuery: calendarQuery
}));
vi.mock('~/stores/hooks', () => ({ useAppStores: () => ({}) }));
vi.mock('@tanstack/react-store', () => ({ useSelector: () => preferredFansubs }));
// Expose menu links without hover/focus plumbing; navigation uses the real Router Link.
vi.mock('~/components/Dropdown', () => {
  const Menu = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const Dropdown = ({ trigger, children }: { trigger: ReactNode; children: ReactNode }) => (
    <div>
      {trigger}
      {children}
    </div>
  );
  return { Dropdown, DropdownMenu: Menu, DropdownSubMenu: Menu, DropdownSubMenuItem: Dropdown };
});

describe('Header navigation', () => {
  let root: Root;
  let container: HTMLDivElement;
  const send = vi.fn();
  const feedURL = 'https://api.example.com/feed.xml?type=动画';

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.assign(window, { umami: { track: send } });
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    Reflect.deleteProperty(window, 'umami');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  /** Mounts Header in a memory router so a full-page anchor cannot pass navigation assertions. */
  async function renderHeader(season?: string) {
    calendarQuery.mockReturnValue({ data: season ? { season, calendar: [] } : undefined });
    const rootRoute = createRootRoute({
      component: () => (
        <>
          <Header feedURL={feedURL} />
          <Outlet />
        </>
      )
    });
    const index = createRoute({ getParentRoute: () => rootRoute, path: '/' });
    const anime = createRoute({ getParentRoute: () => rootRoute, path: '/anime' });
    const calendar = createRoute({ getParentRoute: () => rootRoute, path: '/calendar/$season' });
    const resources = createRoute({ getParentRoute: () => rootRoute, path: '/resources' });
    const subject = createRoute({ getParentRoute: () => rootRoute, path: '/subject/$subject' });
    const router = createRouter({
      routeTree: rootRoute.addChildren([index, anime, calendar, resources, subject]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
      defaultPendingMinMs: 0
    });
    await router.load();
    await act(async () => root.render(<RouterProvider router={router} />));
    return router;
  }

  it.each([
    { label: '动画', season: undefined, path: '/anime' },
    { label: '周历', season: undefined, path: '/anime' },
    { label: '动画', season: '2026-10', path: '/calendar/2026-10' },
    { label: '周历', season: '2026-10', path: '/calendar/2026-10' }
  ])('$label uses client navigation to $path', async ({ label, season, path }) => {
    const router = await renderHeader(season);
    const link = [...container.querySelectorAll('a')].find((link) => link.textContent === label)!;
    expect(link.getAttribute('href')).toBe(path);

    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    await act(async () => {
      link.dispatchEvent(click);
    });

    expect(click.defaultPrevented).toBe(true);
    expect(router.history.location.pathname).toBe(path);
    expect(send).toHaveBeenCalledExactlyOnceWith('nav.click.anime', undefined);
  });

  it('keeps RSS as an external feed link in a new tab', async () => {
    await renderHeader();
    const link = [...container.querySelectorAll('a')].find((link) => link.textContent === 'RSS')!;
    expect(link.getAttribute('href')).toBe(feedURL);
    expect(link.target).toBe('_blank');
    expect(send).not.toHaveBeenCalled();
  });
});
