// @vitest-environment jsdom
import { act, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const { fetchResourcesFn } = vi.hoisted(() => ({ fetchResourcesFn: vi.fn() }));
vi.mock('../src/query/proxy', () => ({ fetchResourcesFn }));

import {
  loadResourceList,
  updateCurrentResourceAnchor,
  useResourceList
} from '../src/query/animegarden';
import { InfiniteScrollSentinel, type LoadMoreProps } from '../src/components/Resources/load-more';

const filter = { types: ['动画'], limit: 30 };
const A = Date.parse('2026-07-01');
let client: QueryClient;
let root: Root;
let container: HTMLDivElement;
const observers: TestIntersectionObserver[] = [];

/** Drive visibility independently of DOM layout and retain callbacks to test late observer delivery. */
class TestIntersectionObserver {
  private element!: Element;
  public readonly disconnect = vi.fn();
  public readonly observe = vi.fn((element: Element) => {
    this.element = element;
  });

  constructor(
    private readonly callback: IntersectionObserverCallback,
    public readonly options: IntersectionObserverInit
  ) {
    observers.push(this);
  }

  public intersect(isIntersecting: boolean) {
    this.callback(
      [{ target: this.element, isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
}

function batch(anchor: number, id: number, nextCursor: string | null) {
  return {
    ok: true,
    resources: [{ id }],
    pagination: { anchor, limit: 30, nextCursor, complete: nextCursor === null },
    filter,
    timestamp: new Date(anchor),
    error: undefined
  };
}

function List() {
  const query = useResourceList(filter);
  return (
    <>
      <div data-testid="rows">{query.data.resources.map((resource) => resource.id).join(',')}</div>
      <div data-testid="error">{query.error?.message}</div>
      <InfiniteScrollSentinel
        complete={query.data.pagination?.complete}
        isLoadingMore={query.isFetchingNextPage}
        hasLoadMoreError={Boolean(query.error)}
        onLoadMore={query.fetchNextPage}
      />
    </>
  );
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
  observers.length = 0;
  fetchResourcesFn.mockReset();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('scrolls to load, pauses on failure, retries and replaces pages on a first-batch refresh', async () => {
  fetchResourcesFn.mockResolvedValueOnce(batch(A, 1, 'next'));
  await loadResourceList(client, filter);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <Suspense fallback="loading">
          <List />
        </Suspense>
      </QueryClientProvider>
    );
  });
  const rows = () => container.querySelector('[data-testid=rows]')!.textContent;
  const error = () => container.querySelector('[data-testid=error]')!.textContent;
  expect(rows()).toBe('1');
  expect(container.querySelector('button')).toBeNull();
  expect(observers).toHaveLength(1);
  expect(observers[0].options.rootMargin).toBe('300px 0px');

  fetchResourcesFn.mockResolvedValueOnce({
    ok: false,
    resources: [],
    error: { message: 'offline' }
  });
  await act(async () => {
    observers[0].intersect(true);
    observers[0].intersect(true);
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  expect(rows()).toBe('1');
  expect(error()).toBe('offline');
  expect(container.querySelector('[role=alert]')!.textContent).toContain('资源加载失败');
  expect(container.querySelector('[role=alert] .i-carbon-error')).not.toBeNull();
  expect(container.querySelector('[role=alert]')!.classList.contains('text-base')).toBe(true);
  expect(container.querySelector('[role=alert]')!.classList.contains('flex-col')).toBe(false);
  expect(container.querySelector('button')!.previousElementSibling!.textContent).toBe(
    '资源加载失败'
  );
  expect(
    container.querySelector('[role=alert]')!.parentElement!.classList.contains('justify-center')
  ).toBe(true);
  expect(container.querySelector('button')!.textContent).toBe('重试');
  expect(fetchResourcesFn).toHaveBeenCalledTimes(2);
  await act(async () => observers[0].intersect(true));
  expect(fetchResourcesFn).toHaveBeenCalledTimes(2);

  fetchResourcesFn.mockResolvedValueOnce(batch(A, 2, null));
  await act(async () => {
    container.querySelector('button')!.click();
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  expect(rows()).toBe('1,2');
  expect(error()).toBe('');
  expect(container.querySelector('button')).toBeNull();

  updateCurrentResourceAnchor(client, A + 1000);
  fetchResourcesFn.mockResolvedValueOnce(batch(A + 1000, 3, null));
  await act(async () => {
    await client.invalidateQueries({ queryKey: ['api', 'resources'] });
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  expect(rows()).toBe('3');
  expect(fetchResourcesFn).toHaveBeenCalledTimes(4);
});

async function renderSentinel(props: LoadMoreProps) {
  await act(async () => root.render(<InfiniteScrollSentinel {...props} />));
}

it('only loads intersecting idle tails once and remeasures after each batch', async () => {
  vi.useFakeTimers();
  const onLoadMore = vi.fn();
  await renderSentinel({ onLoadMore, complete: false });
  await act(async () => observers[0].intersect(false));
  expect(onLoadMore).not.toHaveBeenCalled();
  await act(async () => {
    observers[0].intersect(true);
    observers[0].intersect(true);
  });
  expect(onLoadMore).toHaveBeenCalledOnce();

  // An unrelated render must not re-arm the tail before the request settles.
  await renderSentinel({ onLoadMore, complete: false });
  expect(observers).toHaveLength(1);
  await renderSentinel({ onLoadMore, complete: false, isLoadingMore: true });
  expect(container.querySelector('[role=status]')!.textContent).toBe('');
  expect(container.querySelector('[role=status]')!.getAttribute('aria-label')).toBe('加载中');
  expect(container.querySelector('[role=status] .animate-spin')).not.toBeNull();
  expect(container.querySelector('[role=status] .text-sky-700')).not.toBeNull();
  expect(
    container.querySelector('[role=status]')!.parentElement!.classList.contains('justify-center')
  ).toBe(true);
  expect(observers[0].disconnect).toHaveBeenCalledOnce();
  await act(async () => observers[0].intersect(true));
  expect(onLoadMore).toHaveBeenCalledOnce();

  await renderSentinel({ onLoadMore, complete: false, isLoadingMore: false });
  expect(observers).toHaveLength(2);
  // The appended rows may have moved the tail off-screen; do not assume it is still visible.
  await act(async () => observers[1].intersect(false));
  expect(onLoadMore).toHaveBeenCalledOnce();
  await act(async () => observers[1].intersect(true));
  expect(onLoadMore).toHaveBeenCalledOnce();
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  expect(onLoadMore).toHaveBeenCalledTimes(2);

  await renderSentinel({ onLoadMore, complete: true });
  await act(async () => observers[1].intersect(true));
  expect(onLoadMore).toHaveBeenCalledTimes(2);
  expect(container.textContent).toBe('');
});

it('only waits for the remaining interval after fast requests, without delaying slow requests', async () => {
  vi.useFakeTimers();
  const onLoadMore = vi.fn();
  await renderSentinel({ onLoadMore });
  await act(async () => observers[0].intersect(true));
  expect(onLoadMore).toHaveBeenCalledOnce();
  await renderSentinel({ onLoadMore, isLoadingMore: true });
  await act(async () => vi.advanceTimersByTimeAsync(200));
  await renderSentinel({ onLoadMore, isLoadingMore: false });
  await act(async () => {
    observers[1].intersect(true);
    observers[1].intersect(true);
  });
  expect(container.querySelector('[role=status]')).not.toBeNull();
  await act(async () => vi.advanceTimersByTimeAsync(799));
  expect(onLoadMore).toHaveBeenCalledOnce();
  await act(async () => vi.advanceTimersByTimeAsync(1));
  expect(onLoadMore).toHaveBeenCalledTimes(2);

  await renderSentinel({ onLoadMore, isLoadingMore: true });
  await act(async () => vi.advanceTimersByTimeAsync(1500));
  await renderSentinel({ onLoadMore, isLoadingMore: false });
  await act(async () => observers[2].intersect(true));
  expect(onLoadMore).toHaveBeenCalledTimes(3);
});

it('cancels a delayed load when the tail leaves view and resumes only on re-entry', async () => {
  vi.useFakeTimers();
  const onLoadMore = vi.fn();
  await renderSentinel({ onLoadMore });
  await act(async () => observers[0].intersect(true));
  await renderSentinel({ onLoadMore, isLoadingMore: true });
  await renderSentinel({ onLoadMore, isLoadingMore: false });
  await act(async () => observers[1].intersect(true));
  await act(async () => observers[1].intersect(false));
  expect(container.querySelector('[role=status]')).toBeNull();
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  expect(onLoadMore).toHaveBeenCalledOnce();
  await act(async () => observers[1].intersect(true));
  expect(onLoadMore).toHaveBeenCalledTimes(2);
});

it.each(['filter', 'unmount', 'complete', 'error'] as const)(
  'cancels the delayed load on %s',
  async (change) => {
    vi.useFakeTimers();
    const oldLoad = vi.fn();
    const newLoad = vi.fn();
    await renderSentinel({ onLoadMore: oldLoad });
    await act(async () => observers[0].intersect(true));
    await renderSentinel({ onLoadMore: oldLoad, isLoadingMore: true });
    await renderSentinel({ onLoadMore: oldLoad, isLoadingMore: false });
    await act(async () => observers[1].intersect(true));
    if (change === 'filter') await renderSentinel({ onLoadMore: newLoad });
    else if (change === 'unmount') await act(async () => root.render(null));
    else
      await renderSentinel({
        onLoadMore: oldLoad,
        complete: change === 'complete',
        hasLoadMoreError: change === 'error'
      });
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(oldLoad).toHaveBeenCalledOnce();
    expect(newLoad).not.toHaveBeenCalled();
  }
);

it('disconnects old observers when the filter changes and ignores callbacks after unmount', async () => {
  const oldLoad = vi.fn();
  const newLoad = vi.fn();
  await renderSentinel({ onLoadMore: oldLoad });
  await renderSentinel({ onLoadMore: newLoad });
  expect(observers[0].disconnect).toHaveBeenCalledOnce();
  await act(async () => {
    observers[0].intersect(true);
    observers[1].intersect(true);
  });
  expect(oldLoad).not.toHaveBeenCalled();
  expect(newLoad).toHaveBeenCalledOnce();
  await act(async () => root.render(null));
  expect(observers[1].disconnect).toHaveBeenCalledOnce();
  await act(async () => observers[1].intersect(true));
  expect(newLoad).toHaveBeenCalledOnce();
});
