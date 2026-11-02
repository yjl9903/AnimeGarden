import {
  focusManager,
  InfiniteQueryObserver,
  onlineManager,
  QueryClient
} from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeResourcesCursor, encodeResourcesCursor } from '@animegarden/shared';

const { fetchTimestampFn, fetchResourcesFn } = vi.hoisted(() => ({
  fetchTimestampFn: vi.fn(),
  fetchResourcesFn: vi.fn()
}));
vi.mock('../src/query/proxy', () => ({ fetchTimestampFn, fetchResourcesFn }));

import {
  getCurrentResourceAnchor,
  loadResourceList,
  resourcesListQueryOptions,
  resourcesQueryOptions,
  timestampQueryKey,
  timestampQueryOptions,
  updateCurrentResourceAnchor
} from '../src/query/animegarden';

const A = Date.parse('2026-07-01');
const B = A + 1000;
const filter = { types: ['动画'], limit: 30 };
const options = resourcesListQueryOptions(filter);
const clients: QueryClient[] = [];

function client() {
  const value = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(value);
  return value;
}

/** Exercise the native continuation API without mounting React for each query-level assertion. */
async function fetchNextResourcePage(
  cache: QueryClient,
  input: Parameters<typeof resourcesListQueryOptions>[0]
) {
  const observer = new InfiniteQueryObserver(cache, resourcesListQueryOptions(input));
  try {
    return await observer.fetchNextPage({ cancelRefetch: false });
  } finally {
    observer.destroy();
  }
}

function batch(anchor = A, nextCursor: string | null = null) {
  return {
    ok: true as const,
    resources: [],
    pagination: { anchor, limit: 30, nextCursor, complete: nextCursor === null },
    filter: { types: ['动画'] },
    // Deliberately newer than the actual query version.
    timestamp: new Date(B + 1000),
    error: undefined
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('resource version side channel', () => {
  it('queries without a cursor when unknown, then uses the actual response anchor', async () => {
    const cache = client();
    fetchResourcesFn.mockResolvedValue(batch());
    await cache.query(resourcesQueryOptions(filter));
    expect(fetchTimestampFn).not.toHaveBeenCalled();
    expect(fetchResourcesFn).toHaveBeenCalledOnce();
    expect(fetchResourcesFn.mock.calls[0][0].data.filter.cursor).toBeUndefined();
    expect(getCurrentResourceAnchor(cache)).toBe(A);

    await cache.query(resourcesQueryOptions({ ...filter, search: 'other' }));
    expect(decodeResourcesCursor(fetchResourcesFn.mock.calls[1][0].data.filter.cursor)).toEqual({
      anchor: A
    });
  });

  it('does not wait for a pending version request or perform a catch-up request', async () => {
    const cache = client();
    const status = deferred<{ ok: true; timestamp: Date }>();
    fetchTimestampFn.mockReturnValue(status.promise);
    const polling = cache.query(timestampQueryOptions());
    fetchResourcesFn.mockResolvedValue(batch());
    await loadResourceList(cache, filter);
    expect(fetchResourcesFn).toHaveBeenCalledOnce();
    expect(getCurrentResourceAnchor(cache)).toBe(A);
    status.resolve({ ok: true, timestamp: new Date(B) });
    await polling;
    expect(getCurrentResourceAnchor(cache)).toBe(B);
    expect(cache.getQueryData(options.queryKey)!.pages[0].pagination!.anchor).toBe(A);
    expect(fetchResourcesFn).toHaveBeenCalledOnce();
  });

  it('keeps the version monotonic on failed or stale status responses', async () => {
    const cache = client();
    updateCurrentResourceAnchor(cache, B);
    fetchTimestampFn
      .mockResolvedValueOnce({ ok: false, timestamp: new Date(B + 1000) })
      .mockResolvedValueOnce({ ok: true, timestamp: new Date(A) });
    await expect(cache.query({ ...timestampQueryOptions(), staleTime: 0 })).rejects.toThrow(
      'Failed fetching timestamp'
    );
    await cache.query({ ...timestampQueryOptions(), staleTime: 0 });
    expect(getCurrentResourceAnchor(cache)).toBe(B);
    fetchResourcesFn.mockResolvedValue(batch(B));
    await loadResourceList(cache, filter);
    expect(decodeResourcesCursor(fetchResourcesFn.mock.calls[0][0].data.filter.cursor)).toEqual({
      anchor: B
    });
  });

  it('accepts an in-flight older response for a new list without regressing the global version', async () => {
    const cache = client();
    const response = deferred<ReturnType<typeof batch>>();
    fetchResourcesFn.mockReturnValue(response.promise);
    const loading = loadResourceList(cache, filter);
    updateCurrentResourceAnchor(cache, B);
    response.resolve(batch(A));
    expect((await loading).pages[0].pagination!.anchor).toBe(A);
    expect(getCurrentResourceAnchor(cache)).toBe(B);
    expect(fetchResourcesFn).toHaveBeenCalledOnce();
  });

  it('isolates versions between QueryClients (including SSR requests)', () => {
    const first = client();
    const second = client();
    updateCurrentResourceAnchor(first, B);
    expect(getCurrentResourceAnchor(second)).toBeUndefined();
  });

  it('stores learned anchors in the status query without postponing status refreshes', async () => {
    const cache = client();
    updateCurrentResourceAnchor(cache, A);
    expect(cache.getQueryData(timestampQueryKey)).toEqual({ ok: true, timestamp: new Date(A) });
    expect(cache.getQueryState(timestampQueryKey)?.dataUpdatedAt).toBe(0);
    expect(cache.getQueryCache().getAll()).toHaveLength(1);

    fetchTimestampFn.mockResolvedValueOnce({ ok: true, timestamp: new Date(A) });
    await cache.query(timestampQueryOptions());
    expect(fetchTimestampFn).toHaveBeenCalledOnce();
    const updatedAt = cache.getQueryState(timestampQueryKey)!.dataUpdatedAt;
    expect(updatedAt).toBeGreaterThan(0);
    updateCurrentResourceAnchor(cache, B);
    expect(cache.getQueryData(timestampQueryKey)).toEqual({ ok: true, timestamp: new Date(B) });
    expect(cache.getQueryState(timestampQueryKey)?.dataUpdatedAt).toBe(updatedAt);
  });

  it('retains the shared timestamp when a pending poll returns an older version', async () => {
    const cache = client();
    const response = deferred<{ ok: true; timestamp: Date }>();
    fetchTimestampFn.mockReturnValueOnce(response.promise);
    const polling = cache.query(timestampQueryOptions());
    updateCurrentResourceAnchor(cache, B);
    response.resolve({ ok: true, timestamp: new Date(A) });
    expect((await polling).timestamp?.getTime()).toBe(B);
    expect(cache.getQueryData(timestampQueryKey)).toEqual({ ok: true, timestamp: new Date(B) });
  });

  it('keeps an initial status failure as loader data without inventing a version', async () => {
    const cache = client();
    fetchTimestampFn.mockResolvedValueOnce({ ok: false, error: { message: 'offline' } });
    expect(await cache.query(timestampQueryOptions())).toMatchObject({ ok: false });
    expect(getCurrentResourceAnchor(cache)).toBeUndefined();
  });

  it('merges versions at cache commit and keeps polling errors alongside the cached version', async () => {
    const cache = client();
    fetchTimestampFn.mockResolvedValueOnce({ ok: true, timestamp: new Date(A) });
    await cache.query(timestampQueryOptions());
    updateCurrentResourceAnchor(cache, B);
    // A result prepared before the resource response must not overwrite its newer version.
    cache.setQueryData(timestampQueryKey, { ok: true, timestamp: new Date(A) });
    expect(getCurrentResourceAnchor(cache)).toBe(B);
    const previous = cache.getQueryData(timestampQueryKey);

    fetchTimestampFn.mockResolvedValueOnce({ ok: false, error: { message: 'offline' } });
    await expect(cache.query({ ...timestampQueryOptions(), staleTime: 0 })).rejects.toThrow(
      'offline'
    );
    expect(cache.getQueryData(timestampQueryKey)).toBe(previous);
    expect(cache.getQueryState(timestampQueryKey)?.status).toBe('error');
    expect(getCurrentResourceAnchor(cache)).toBe(B);
  });
});

describe('resource list refresh and continuation', () => {
  it.each(['mount', 'focus', 'reconnect', 'invalidate', 'poll'])(
    'refreshes only the first batch on %s, then continues through the new cursor',
    async (trigger) => {
      const cache = client();
      fetchResourcesFn.mockResolvedValueOnce(batch(A, 'next-A')).mockResolvedValueOnce(batch(A));
      await loadResourceList(cache, filter);
      await fetchNextResourcePage(cache, filter);
      const before = cache.getQueryData(options.queryKey);
      expect(before?.pages).toHaveLength(2);

      const observer = new InfiniteQueryObserver(cache, options);
      let unsubscribe = () => {};
      cache.mount();
      try {
        if (trigger !== 'mount') {
          unsubscribe = observer.subscribe(() => {});
          // A React render supplies fresh options too; it must not lose the one-page refresh policy.
          observer.setOptions(resourcesListQueryOptions(filter));
        }
        await cache.invalidateQueries({ queryKey: options.queryKey, refetchType: 'none' });
        updateCurrentResourceAnchor(cache, B);
        const response = deferred<ReturnType<typeof batch>>();
        fetchResourcesFn.mockReturnValueOnce(response.promise);

        if (trigger === 'mount') unsubscribe = observer.subscribe(() => {});
        else if (trigger === 'focus') {
          focusManager.setFocused(false);
          focusManager.setFocused(true);
        } else if (trigger === 'reconnect') {
          onlineManager.setOnline(false);
          onlineManager.setOnline(true);
        } else if (trigger === 'invalidate') {
          void cache.invalidateQueries({ queryKey: options.queryKey });
        } else {
          vi.stubGlobal('document', { visibilityState: 'visible' });
          fetchTimestampFn.mockResolvedValueOnce({ ok: true, timestamp: new Date(B) });
          await cache.query({ ...timestampQueryOptions(), staleTime: 0 });
        }

        await vi.waitFor(() => expect(fetchResourcesFn).toHaveBeenCalledTimes(3));
        expect(cache.getQueryData(options.queryKey)).toBe(before);
        expect(decodeResourcesCursor(fetchResourcesFn.mock.calls[2][0].data.filter.cursor)).toEqual(
          {
            anchor: B
          }
        );
        response.resolve(batch(B, 'next-B'));
        await vi.waitFor(() => expect(observer.getCurrentResult().isFetching).toBe(false));
        expect(cache.getQueryData(options.queryKey)?.pages).toHaveLength(1);
        expect(cache.getQueryData(options.queryKey)?.pageParams).toEqual([undefined]);
        expect(fetchResourcesFn).toHaveBeenCalledTimes(3);

        fetchResourcesFn.mockResolvedValueOnce(batch(B));
        await observer.fetchNextPage({ cancelRefetch: false });
        expect(fetchResourcesFn.mock.calls[3][0].data.filter.cursor).toBe('next-B');
        expect(cache.getQueryData(options.queryKey)?.pages).toHaveLength(2);
        expect(cache.getQueryData(options.queryKey)?.pageParams).toEqual([undefined, 'next-B']);
        expect(
          cache
            .getQueryCache()
            .getAll()
            .map((query) => query.queryKey)
        ).toEqual(expect.arrayContaining([options.queryKey, timestampQueryKey]));
        expect(cache.getQueryCache().getAll()).toHaveLength(2);
      } finally {
        unsubscribe();
        cache.unmount();
        focusManager.setFocused(undefined);
        onlineManager.setOnline(true);
      }
    }
  );

  it('keeps a first-batch error as loader data even when the request has an anchor-only cursor', async () => {
    const cache = client();
    updateCurrentResourceAnchor(cache, A);
    fetchResourcesFn.mockResolvedValueOnce({
      ok: false,
      resources: [],
      error: { message: 'offline' }
    });
    const result = await loadResourceList(cache, filter);
    expect(result.pages[0].ok).toBe(false);
    expect(fetchResourcesFn).toHaveBeenCalledOnce();
    expect(decodeResourcesCursor(fetchResourcesFn.mock.calls[0][0].data.filter.cursor)).toEqual({
      anchor: A
    });
  });

  it('continues using the resolved server filter rather than resolving names again', async () => {
    const cache = client();
    const input = { subject: 'a name', limit: 30 };
    fetchResourcesFn.mockResolvedValueOnce({ ...batch(A, 'next'), filter: { subjects: [42] } });
    await loadResourceList(cache, input);
    fetchResourcesFn.mockResolvedValueOnce(batch(A));
    await fetchNextResourcePage(cache, input);
    expect(fetchResourcesFn.mock.calls[1][0].data.filter).toEqual({
      subjects: [42],
      limit: 30,
      cursor: 'next'
    });
  });

  it('replaces all loaded pages with one first batch using the newest known version', async () => {
    const cache = client();
    const next = encodeResourcesCursor({ anchor: A, position: { createdAt: A - 1, id: 2 } });
    fetchResourcesFn.mockResolvedValueOnce(batch(A, next)).mockResolvedValueOnce(batch(A));
    await loadResourceList(cache, filter);
    updateCurrentResourceAnchor(cache, B);
    await fetchNextResourcePage(cache, filter);
    expect(fetchResourcesFn.mock.calls[1][0].data.filter.cursor).toBe(next);
    expect(cache.getQueryData(options.queryKey)!.pages).toHaveLength(2);

    fetchResourcesFn.mockResolvedValueOnce(batch(B));
    await cache.infiniteQuery({ ...options, staleTime: 0 });
    expect(cache.getQueryData(options.queryKey)!.pages).toHaveLength(1);
    expect(decodeResourcesCursor(fetchResourcesFn.mock.calls[2][0].data.filter.cursor)).toEqual({
      anchor: B
    });
    expect(fetchResourcesFn).toHaveBeenCalledTimes(3);
    expect(fetchTimestampFn).not.toHaveBeenCalled();
  });

  it('reuses fresh navigation data, but a known newer version makes the next navigation query once', async () => {
    const cache = client();
    fetchResourcesFn.mockResolvedValueOnce(batch(A)).mockResolvedValueOnce(batch(B));
    await loadResourceList(cache, filter);
    await loadResourceList(cache, filter);
    expect(fetchResourcesFn).toHaveBeenCalledOnce();
    updateCurrentResourceAnchor(cache, B);
    await loadResourceList(cache, filter);
    expect(fetchResourcesFn).toHaveBeenCalledTimes(2);
  });

  it('retains all pages on failed refreshes, including when the first request carries a cursor', async () => {
    const cache = client();
    updateCurrentResourceAnchor(cache, A);
    fetchResourcesFn.mockResolvedValueOnce(batch(A, 'next')).mockResolvedValueOnce(batch(A));
    await loadResourceList(cache, filter);
    await fetchNextResourcePage(cache, filter);
    const before = cache.getQueryData(options.queryKey);
    fetchResourcesFn.mockResolvedValueOnce({
      ok: false,
      error: { message: 'offline' },
      resources: []
    });
    await expect(cache.infiniteQuery({ ...options, staleTime: 0 })).rejects.toThrow('offline');
    expect(cache.getQueryData(options.queryKey)).toBe(before);
  });

  it.each(['stale', 'newer-version'])(
    'completes navigation with all cached pages when a %s refresh fails',
    async (reason) => {
      const cache = client();
      fetchResourcesFn.mockResolvedValueOnce(batch(A, 'next')).mockResolvedValueOnce(batch(A));
      await loadResourceList(cache, filter);
      await fetchNextResourcePage(cache, filter);
      const before = cache.getQueryData(options.queryKey);
      expect(before?.pages).toHaveLength(2);

      if (reason === 'newer-version') updateCurrentResourceAnchor(cache, B);
      else await cache.invalidateQueries({ queryKey: options.queryKey, refetchType: 'none' });
      const updatedAt = cache.getQueryState(options.queryKey)!.dataUpdatedAt;
      fetchResourcesFn.mockResolvedValueOnce({
        ok: false,
        resources: [],
        error: { message: 'offline' }
      });

      expect(await loadResourceList(cache, filter)).toBe(before);
      expect(fetchResourcesFn).toHaveBeenCalledTimes(3);
      expect(cache.getQueryState(options.queryKey)).toMatchObject({
        status: 'error',
        error: { message: 'offline' },
        dataUpdatedAt: updatedAt
      });
    }
  );

  it.each([false, true])(
    'propagates navigation failures without successful cached data (cached failure: %s)',
    async (cachedFailure) => {
      const cache = client();
      if (cachedFailure) {
        fetchResourcesFn.mockResolvedValueOnce({
          ok: false,
          resources: [],
          error: { message: 'initial failure' }
        });
        await loadResourceList(cache, filter);
        await cache.invalidateQueries({ queryKey: options.queryKey, refetchType: 'none' });
      }
      fetchResourcesFn.mockRejectedValueOnce(new Error('offline'));
      await expect(loadResourceList(cache, filter)).rejects.toThrow('offline');
    }
  );

  it('does not regress an already displayed list or retry a stale response', async () => {
    const cache = client();
    fetchResourcesFn.mockResolvedValueOnce(batch(B)).mockResolvedValueOnce(batch(A));
    await loadResourceList(cache, filter);
    const before = cache.getQueryData(options.queryKey);
    await cache.infiniteQuery({ ...options, staleTime: 0 });
    expect(cache.getQueryData(options.queryKey)).toBe(before);
    expect(fetchResourcesFn).toHaveBeenCalledTimes(2);
  });

  it.each(['next', 'new-next'])(
    'ignores a continuation after a same-version refresh returning cursor %s',
    async (nextCursor) => {
      const cache = client();
      const initial = batch(A, 'next');
      fetchResourcesFn.mockResolvedValueOnce(initial);
      await loadResourceList(cache, filter);
      const before = cache.getQueryData(options.queryKey);
      const response = deferred<ReturnType<typeof batch>>();
      fetchResourcesFn.mockReturnValueOnce(response.promise);
      const continuation = fetchNextResourcePage(cache, filter);
      fetchResourcesFn.mockResolvedValueOnce(
        nextCursor === 'next' ? initial : batch(A, nextCursor)
      );
      // Native refetch cancels an in-flight continuation, even if its transport resolves later.
      await cache.refetchQueries({ queryKey: options.queryKey });
      if (nextCursor === 'next') {
        expect(cache.getQueryData(options.queryKey)).toBe(before);
      }
      response.resolve(batch(A));
      await continuation;
      const result = cache.getQueryData(options.queryKey)!;
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].pagination!.nextCursor).toBe(nextCursor);
    }
  );

  it('deduplicates simultaneous load-more calls and keeps failures retryable', async () => {
    const cache = client();
    fetchResourcesFn.mockResolvedValueOnce(batch(A, 'next'));
    await loadResourceList(cache, filter);
    fetchResourcesFn.mockResolvedValueOnce({
      ok: false,
      error: { message: 'offline' },
      resources: []
    });
    const failed = await fetchNextResourcePage(cache, filter);
    expect(failed.isFetchNextPageError).toBe(true);
    expect(failed.error?.message).toBe('offline');
    expect(cache.getQueryData(options.queryKey)!.pages).toHaveLength(1);
    fetchResourcesFn.mockResolvedValueOnce(batch(A));
    await Promise.all([fetchNextResourcePage(cache, filter), fetchNextResourcePage(cache, filter)]);
    expect(fetchResourcesFn).toHaveBeenCalledTimes(3);
    expect(cache.getQueryData(options.queryKey)!.pages).toHaveLength(2);
    await fetchNextResourcePage(cache, filter);
    expect(fetchResourcesFn).toHaveBeenCalledTimes(3);
  });

  it('keeps different filters isolated when an old continuation completes', async () => {
    const cache = client();
    fetchResourcesFn.mockResolvedValueOnce(batch(A, 'next'));
    await loadResourceList(cache, filter);
    const response = deferred<ReturnType<typeof batch>>();
    fetchResourcesFn.mockReturnValueOnce(response.promise);
    const old = fetchNextResourcePage(cache, filter);
    const otherFilter = { ...filter, search: 'other' };
    fetchResourcesFn.mockResolvedValueOnce(batch(B));
    await loadResourceList(cache, otherFilter);
    response.resolve(batch(A));
    await old;
    expect(cache.getQueryData(resourcesListQueryOptions(otherFilter).queryKey)!.pages).toHaveLength(
      1
    );
  });

  it('refreshes only active stale lists after a visible successful version poll', async () => {
    vi.stubGlobal('document', { visibilityState: 'visible' });
    const cache = client();
    fetchResourcesFn.mockResolvedValueOnce(batch(A));
    await loadResourceList(cache, filter);
    const observer = new InfiniteQueryObserver(cache, options);
    const unsubscribe = observer.subscribe(() => {});
    await cache.invalidateQueries({ queryKey: options.queryKey, refetchType: 'none' });
    fetchResourcesFn.mockResolvedValueOnce(batch(B));
    fetchTimestampFn.mockResolvedValue({ ok: true, timestamp: new Date(B) });
    await cache.query(timestampQueryOptions());
    await vi.waitFor(() =>
      expect(cache.getQueryData(options.queryKey)!.pages[0].pagination!.anchor).toBe(B)
    );
    expect(fetchResourcesFn).toHaveBeenCalledTimes(2);
    await cache.query({ ...timestampQueryOptions(), staleTime: 0 });
    expect(fetchResourcesFn).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('does not refresh a hidden stale list when a status response arrives', async () => {
    vi.stubGlobal('document', { visibilityState: 'hidden' });
    const cache = client();
    fetchResourcesFn.mockResolvedValueOnce(batch(A));
    await loadResourceList(cache, filter);
    const observer = new InfiniteQueryObserver(cache, options);
    const unsubscribe = observer.subscribe(() => {});
    await cache.invalidateQueries({ queryKey: options.queryKey, refetchType: 'none' });
    fetchTimestampFn.mockResolvedValueOnce({ ok: true, timestamp: new Date(B) });
    await cache.query(timestampQueryOptions());
    expect(getCurrentResourceAnchor(cache)).toBe(B);
    expect(fetchResourcesFn).toHaveBeenCalledOnce();
    unsubscribe();
  });
});
