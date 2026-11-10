import { afterEach, expect, it, vi } from 'vitest';
import { memo } from '../src/utils/cache';

afterEach(() => vi.useRealTimers());

it('collects expired entries while keeping fresh results', async () => {
  vi.useFakeTimers();
  const fn = vi.fn(async (key: string) => key);
  const cached = memo(fn, {
    getKey: (key) => key,
    expirationTtl: 100,
    maxSize: 10,
    autoStartGC: false
  });
  await cached('old');
  await vi.advanceTimersByTimeAsync(50);
  await cached('fresh');
  await vi.advanceTimersByTimeAsync(51);
  cached.gc();
  await cached('fresh');
  expect(fn).toHaveBeenCalledTimes(2);
  await cached('old');
  expect(fn).toHaveBeenCalledTimes(3);
});

it('invalidates pending calls without letting their failure delete a replacement entry', async () => {
  const old = Promise.withResolvers<number>();
  const fresh = Promise.withResolvers<number>();
  const fn = vi
    .fn()
    .mockImplementationOnce(() => old.promise)
    .mockImplementationOnce(() => fresh.promise);
  const cached = memo(fn, {
    getKey: () => '',
    expirationTtl: 1000,
    maxSize: 10,
    autoStartGC: false,
    cacheErrors: false
  });
  const first = cached();
  const joined = cached();
  cached.clear();
  const next = cached();
  const failures = Promise.all([
    expect(first).rejects.toThrow('old failure'),
    expect(joined).rejects.toThrow('old failure')
  ]);
  old.reject(new Error('old failure'));
  await failures;
  const nextJoined = cached();
  fresh.resolve(2);
  expect(await next).toBe(2);
  expect(await nextJoined).toBe(2);
  expect(await cached()).toBe(2);
  expect(fn).toHaveBeenCalledTimes(2);
  cached.clear();
  fn.mockResolvedValue(3);
  expect(await cached()).toBe(3);
});
