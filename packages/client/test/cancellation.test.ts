import { describe, expect, it, vi } from 'vitest';

import { fetchAPI } from '../src/api/base';
import { fetchResources } from '../src/api/resources';
import { fetchStatus } from '../src/api/status';
import type { FetchOptions } from '../src/types';

const baseURL = 'https://example.invalid/';
const cancellationReasons = [
  { name: 'Error', create: () => new Error('superseded') },
  { name: 'string', create: () => 'superseded' },
  { name: 'plain object', create: () => ({ cause: 'superseded' }) },
  { name: 'null', create: () => null }
];

/** A pending transport rejects only when the request signal aborts, like native fetch. */
function createPendingFetch(maskReason = false) {
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  const fetch = vi.fn<NonNullable<FetchOptions['fetch']>>((_request, init) => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) throw new Error('The test requires a request signal');
      const abort = () => {
        reject(maskReason ? new DOMException('transport aborted', 'AbortError') : signal.reason);
      };
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort, { once: true });
      markStarted();
    });
  });
  return { fetch, started };
}

/** Resolves headers immediately while leaving response bytes pending until cancellation. */
function createPendingBodyFetch(status = 200) {
  const bodyError = new DOMException('body interrupted', 'AbortError');
  const fetch = vi.fn<NonNullable<FetchOptions['fetch']>>(async (_request, init) => {
    const signal = init?.signal;
    if (!signal) throw new Error('The test requires a request signal');
    return new Response(
      new ReadableStream({
        start(body) {
          const abort = () => body.error(bodyError);
          if (signal.aborted) abort();
          else signal.addEventListener('abort', abort, { once: true });
        }
      }),
      { status }
    );
  });
  return { fetch, bodyError };
}

const resourcesPage = {
  resources: [
    {
      id: 1,
      provider: 'dmhy',
      providerId: '1',
      title: 'Resource 1',
      href: 'https://example.invalid/1',
      type: '动画',
      magnet: 'magnet:?xt=urn:btih:1',
      size: 1024,
      publisher: { id: 1, name: 'publisher' },
      createdAt: '2026-05-08T00:00:00.000Z',
      fetchedAt: '2026-05-08T00:00:00.000Z'
    }
  ],
  pagination: { page: 1, pageSize: 1, complete: false },
  filter: {},
  timestamp: '2026-05-08T00:00:00.000Z'
};

describe('request cancellation', () => {
  it.each(cancellationReasons)(
    'classifies a pre-aborted $name reason as ABORTED',
    async ({ create }) => {
      const reason = create();
      const controller = new AbortController();
      controller.abort(reason);
      const { fetch } = createPendingFetch();

      const result = await fetchStatus({ baseURL, fetch, signal: controller.signal, retry: 2 });

      expect(result).toMatchObject({ ok: false, code: 'ABORTED', error: { retryable: false } });
      if (result.ok) throw new Error('Expected cancellation');
      expect(result.error.original).toBe(reason);
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it.each(cancellationReasons)(
    'classifies a pending $name cancellation with a combined timeout signal as ABORTED',
    async ({ create }) => {
      const reason = create();
      const controller = new AbortController();
      const { fetch, started } = createPendingFetch();
      const pending = fetchStatus({
        baseURL,
        fetch,
        signal: controller.signal,
        timeout: 1000,
        retry: 2
      });
      await started;
      controller.abort(reason);

      const result = await pending;

      expect(result).toMatchObject({ ok: false, code: 'ABORTED', error: { retryable: false } });
      if (result.ok) throw new Error('Expected cancellation');
      expect(result.error.original).toBe(reason);
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  );

  it('recognizes custom cancellation from native fetch without making a network request', async () => {
    const controller = new AbortController();
    controller.abort(new Error('superseded'));

    const result = await fetchStatus({ baseURL, signal: controller.signal });

    expect(result).toMatchObject({ ok: false, code: 'ABORTED', error: { retryable: false } });
  });

  it('accepts a pending cancellation reason without a string conversion', async () => {
    const reason = Object.create(null);
    const controller = new AbortController();
    const { fetch, started } = createPendingFetch();
    const pending = fetchStatus({ baseURL, fetch, signal: controller.signal, retry: 2 });
    await started;
    controller.abort(reason);

    const result = await pending;

    expect(result).toMatchObject({ ok: false, code: 'ABORTED', error: { retryable: false } });
    if (result.ok) throw new Error('Expected cancellation');
    expect(result.error.original).toBe(reason);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('classifies caller cancellation during the default timeout delay as ABORTED', async () => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fetch = vi.fn(async () => {
      timer = setTimeout(() => controller.abort('superseded'), 10);
      throw new DOMException('transport timed out', 'TimeoutError');
    });

    try {
      const result = await fetchStatus({ baseURL, fetch, signal: controller.signal, retry: 2 });

      expect(result).toMatchObject({ ok: false, code: 'ABORTED', error: { retryable: false } });
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      clearTimeout(timer);
    }
  });

  it.each([false, true])(
    'uses TIMEOUT when the transport reports AbortError (combined signal: %s)',
    async (combined) => {
      const { fetch } = createPendingFetch(true);
      const controller = new AbortController();

      const result = await fetchStatus({
        baseURL,
        fetch,
        timeout: 10,
        signal: combined ? controller.signal : undefined
      });

      expect(result).toMatchObject({ ok: false, code: 'TIMEOUT', error: { retryable: true } });
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(controller.signal.aborted).toBe(false);
    }
  );

  it.each(['AbortError', 'TimeoutError'])(
    'preserves a standard %s reason identity in the low-level API',
    async (name) => {
      const reason = new DOMException('request interrupted', name);
      const { fetch } = createPendingFetch();

      await expect(
        fetchAPI('/', undefined, {
          baseURL,
          fetch,
          signal: AbortSignal.abort(reason),
          hooks: { timeout: () => {} }
        })
      ).rejects.toBe(reason);
    }
  );
});

describe('cancellation after response headers', () => {
  it.each(cancellationReasons)(
    'keeps a $name body-read cancellation as ABORTED',
    async ({ create }) => {
      const controller = new AbortController();
      const { fetch, bodyError } = createPendingBodyFetch();

      const result = await fetchStatus({
        baseURL,
        fetch,
        signal: controller.signal,
        retry: 2,
        hooks: { postfetch: () => controller.abort(create()) }
      });

      expect(result).toMatchObject({
        ok: false,
        code: 'ABORTED',
        error: { retryable: false, status: 200 }
      });
      if (result.ok) throw new Error('Expected cancellation');
      expect(result.error.original).toBe(bodyError);
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  );

  it('uses TIMEOUT when the response body reports only AbortError', async () => {
    const { fetch, bodyError } = createPendingBodyFetch();

    const result = await fetchStatus({ baseURL, fetch, timeout: 10 });

    expect(result).toMatchObject({
      ok: false,
      code: 'TIMEOUT',
      error: { retryable: true, status: 200 }
    });
    if (result.ok) throw new Error('Expected timeout');
    expect(result.error.original).toBe(bodyError);
  });

  it.each([404, 503])(
    'preserves caller cancellation while reading an HTTP %s body',
    async (status) => {
      const controller = new AbortController();
      const { fetch } = createPendingBodyFetch(status);

      const result = await fetchStatus({
        baseURL,
        fetch,
        signal: controller.signal,
        retry: 2,
        hooks: { postfetch: () => controller.abort({ cause: 'superseded' }) }
      });

      expect(result).toMatchObject({ ok: false, code: 'ABORTED', error: { retryable: false } });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  );

  it.each(cancellationReasons)(
    'cancels a rate-limit wait with a $name reason',
    async ({ create }) => {
      const controller = new AbortController();
      const fetch = vi.fn(async () => Response.json({ message: 'slow down' }, { status: 429 }));
      let timer: ReturnType<typeof setTimeout> | undefined;

      try {
        const result = await fetchStatus({
          baseURL,
          fetch,
          signal: controller.signal,
          retry: 2,
          hooks: {
            postfetch: () => {
              timer = setTimeout(() => controller.abort(create()), 10);
            }
          }
        });

        expect(result).toMatchObject({ ok: false, code: 'ABORTED', error: { retryable: false } });
        expect(fetch).toHaveBeenCalledTimes(1);
      } finally {
        clearTimeout(timer);
      }
    }
  );

  it('preserves RATE_LIMITED when the per-request timeout interrupts backoff', async () => {
    const fetch = vi.fn(async () => Response.json({ message: 'slow down' }, { status: 429 }));

    const result = await fetchStatus({ baseURL, fetch, timeout: 10 });

    expect(result).toMatchObject({
      ok: false,
      code: 'RATE_LIMITED',
      error: { retryable: true, status: 429, body: { message: 'slow down' } }
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('preserves RATE_LIMITED when a caller timeout signal interrupts backoff', async () => {
    const fetch = vi.fn(async () => Response.json({ message: 'slow down' }, { status: 429 }));

    const result = await fetchStatus({ baseURL, fetch, signal: AbortSignal.timeout(10), retry: 2 });

    expect(result).toMatchObject({
      ok: false,
      code: 'RATE_LIMITED',
      error: { retryable: true, status: 429, body: { message: 'slow down' } }
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('cancellation between pages and in hooks', () => {
  it('does not fetch when an asynchronous prefetch hook returns after cancellation', async () => {
    const controller = new AbortController();
    const fetch = vi.fn(async () => Response.json({}));

    const result = await fetchStatus({
      baseURL,
      fetch,
      signal: controller.signal,
      retry: 2,
      hooks: {
        prefetch: async () => {
          await Promise.resolve();
          controller.abort('superseded');
        }
      }
    });

    expect(result).toMatchObject({ ok: false, code: 'ABORTED', error: { retryable: false } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(cancellationReasons)(
    'retains partial resources after progress cancels with $name',
    async ({ create }) => {
      const controller = new AbortController();
      const fetch = vi.fn(async () => Response.json(resourcesPage));

      const result = await fetchResources({
        baseURL,
        fetch,
        signal: controller.signal,
        count: 2,
        retry: 2,
        progress: () => controller.abort(create())
      });

      expect(result).toMatchObject({
        ok: false,
        code: 'ABORTED',
        error: { retryable: false },
        pagination: resourcesPage.pagination,
        filter: {}
      });
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0]?.id).toBe(1);
      expect(result.timestamp).toEqual(new Date(resourcesPage.timestamp));
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  );

  it('retains partial resources when progress observes a caller timeout', async () => {
    const controller = new AbortController();
    const fetch = vi.fn(async () => Response.json(resourcesPage));

    const result = await fetchResources({
      baseURL,
      fetch,
      signal: controller.signal,
      count: 2,
      progress: () => controller.abort(new DOMException('caller deadline exceeded', 'TimeoutError'))
    });

    expect(result).toMatchObject({ ok: false, code: 'TIMEOUT', error: { retryable: true } });
    expect(result.resources).toHaveLength(1);
    expect(result.pagination).toEqual(resourcesPage.pagination);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each(['prefetch', 'postfetch'] as const)(
    'does not swallow a %s exception when the hook also cancels',
    async (hook) => {
      const controller = new AbortController();
      const hookError = new Error('application hook failed');

      await expect(
        fetchStatus({
          baseURL,
          fetch: vi.fn(async () => Response.json({})),
          signal: controller.signal,
          retry: 2,
          hooks: {
            [hook]: () => {
              controller.abort('superseded');
              throw hookError;
            }
          }
        })
      ).rejects.toBe(hookError);
    }
  );

  it('does not swallow a progress exception after caller cancellation', async () => {
    const controller = new AbortController();
    const hookError = new Error('application progress failed');

    await expect(
      fetchResources({
        baseURL,
        fetch: vi.fn(async () => Response.json(resourcesPage)),
        signal: controller.signal,
        count: 2,
        progress: () => {
          controller.abort(null);
          throw hookError;
        }
      })
    ).rejects.toBe(hookError);
  });

  it('does not swallow a timeout hook exception when the hook also cancels', async () => {
    const controller = new AbortController();
    const hookError = new Error('application timeout hook failed');
    const fetch = vi.fn(async () => {
      throw new DOMException('transport timed out', 'TimeoutError');
    });

    await expect(
      fetchStatus({
        baseURL,
        fetch,
        signal: controller.signal,
        retry: 2,
        hooks: {
          timeout: () => {
            controller.abort('superseded');
            throw hookError;
          }
        }
      })
    ).rejects.toBe(hookError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
