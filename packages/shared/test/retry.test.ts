import { describe, expect, it, vi } from 'vitest';

import { retryFn } from '../src';

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
