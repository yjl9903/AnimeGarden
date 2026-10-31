import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedCache } from '../src/feed/cache';

afterEach(() => vi.useRealTimers());

function setup(ttl = 60_000, maxBytes = 1024, maxEntries = 128) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-01T00:00:10Z'));
  const cache = new FeedCache(ttl, maxBytes, maxEntries);
  const render = vi.fn(async () => '<rss>first</rss>');
  const get = (key = '') => cache.get(key, render);
  return { cache, render, get };
}

describe('rendered feed cache', () => {
  it('reuses generated content, digest and timestamps without rendering', async () => {
    const { render, get } = setup();
    const first = await get();
    expect(first).toMatchObject({ xml: '<rss>first</rss>', stable: true });
    expect(first.digest).toMatch(/^[a-f0-9]{40}$/);
    expect(await get()).toEqual(first);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('expires entries even if no notification arrives', async () => {
    const { render, get } = setup();
    const first = await get();
    vi.advanceTimersByTime(30_000);
    expect(await get()).toEqual(first);
    render.mockResolvedValue('<rss>second</rss>');
    vi.advanceTimersByTime(30_001);
    const next = await get();
    expect(next.xml).toBe('<rss>second</rss>');
    expect(next.digest).not.toBe(first.digest);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('coalesces identical requests and retries failed renders', async () => {
    const { render, get } = setup();
    let reject!: (reason: Error) => void;
    render.mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        })
    );
    const first = get();
    const second = get();
    reject(new Error('query unavailable'));
    const results = await Promise.allSettled([first, second]);
    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    expect(render).toHaveBeenCalledTimes(1);
    expect((await get()).stable).toBe(true);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('never publishes in-flight XML across a notification or removes newer pending work', async () => {
    const { cache, render, get } = setup();
    await get();
    cache.clear();
    let finishOld!: (xml: string) => void;
    let finishNew!: (xml: string) => void;
    render.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        })
    );
    const old = get();
    cache.clear();
    render.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishNew = resolve;
        })
    );
    const fresh = get();
    finishOld('<rss>first</rss>');
    const stale = await old;
    expect(stale.stable).toBe(false);
    const coalesced = get();
    finishNew('<rss>new revision</rss>');
    for (const response of await Promise.all([fresh, coalesced, get()])) {
      expect(response.xml).toBe('<rss>new revision</rss>');
      expect(response.stable).toBe(true);
    }
    expect(render).toHaveBeenCalledTimes(3);
  });

  it('invalidates completed content and records the latest clear time', async () => {
    const { cache, render, get } = setup();
    const first = await get();
    vi.advanceTimersByTime(100);
    cache.clear();
    const next = await get();
    expect(next.stable).toBe(true);
    expect(next.changedAt).toBe(Date.now());
    expect(next.changedAt).not.toBe(first.changedAt);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('rechecks the clear timestamp when rendering finishes before the result is returned', async () => {
    const { cache, get } = setup();
    const rendering = Promise.withResolvers<string>();
    const pending = cache.get('old', () => rendering.promise);
    const clearing = rendering.promise.then(() => {
      vi.advanceTimersByTime(1);
      cache.clear();
    });

    rendering.resolve('<rss>old</rss>');
    const result = await pending;
    await clearing;

    expect(result.xml).toBe('<rss>old</rss>');
    expect(result.stable).toBe(false);
    expect((await get('old')).xml).toBe('<rss>first</rss>');
  });

  it('evicts the least recently used entries and does not retain oversized XML', async () => {
    const { render, get } = setup(60_000, 40, 2);
    await get('a');
    await get('b');
    await get('a');
    await get('c');
    await get('b');
    expect(render).toHaveBeenCalledTimes(4);
    render.mockResolvedValue('x'.repeat(41));
    await get('large');
    await get('large');
    expect(render).toHaveBeenCalledTimes(6);
  });

  it('limits total XML bytes independently of the entry count', async () => {
    const { render, get } = setup(60_000, 24, 128);
    render.mockResolvedValue('<r>动画</r>');
    await get('a');
    await get('b');
    await get('b');
    expect(render).toHaveBeenCalledTimes(2);
    await get('a');
    expect(render).toHaveBeenCalledTimes(3);
  });
});
