import { describe, expect, it, vi } from 'vitest';

import { retryFn, sleep } from '../src';

describe('retryFn', () => {
  it('stops retrying when shouldRetry returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('stop'));

    await expect(
      retryFn(fn, {
        count: 5,
        shouldRetry: () => false
      })
    ).rejects.toThrow('stop');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('stops retrying when signal is aborted', async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockImplementation(async () => {
      controller.abort();
      throw new Error('aborted');
    });

    await expect(
      retryFn(fn, {
        count: 5,
        signal: controller.signal
      })
    ).rejects.toThrow('aborted');

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('sleep', () => {
  it('rejects immediately when signal is already aborted', async () => {
    const reason = new Error('cancelled');
    const controller = new AbortController();
    controller.abort(reason);

    await expect(sleep(1000, { signal: controller.signal })).rejects.toBe(reason);
  });

  it('clears the pending timer when signal is aborted', async () => {
    vi.useFakeTimers();

    const reason = new Error('cancelled');
    const controller = new AbortController();
    const promise = sleep(1000, { signal: controller.signal });

    controller.abort(reason);

    await expect(promise).rejects.toBe(reason);
    expect(vi.getTimerCount()).toBe(0);

    vi.useRealTimers();
  });
});
