import { describe, it, expect, vi } from 'vitest';

import { fetchStatus } from '../src/api/status';
import { AnimeGardenError } from '../src/error';
// import { fetchResources } from '../src/api/resources';
// import { fetchCollection } from '../src/api/collection';

const timeout = 30 * 1000;

describe('API', () => {
  it('should fetch status', { timeout }, async () => {
    const resp = await fetchStatus({});
    expect(resp.ok).toBe(true);
    if (!resp.ok) throw resp.error;
    expect(resp.timestamp).toBeTruthy();
    expect(resp.providers).toBeTruthy();
  });

  // it('should fetch collection', { timeout }, async () => {
  //   const resp = await fetchCollection('NxRs-dGspGeA1gr6CrUl81qppmC0J4wcSl9tCxrt1tM');
  //   expect(resp!.ok).toBe(true);
  //   expect(resp!.timestamp).toBeTruthy();
  // });

  // it('should fetch resources', { timeout }, async () => {
  //   const resp = await fetchResources({
  //     subject: 363957,
  //     after: new Date(1743350400000)
  //   });
  //   expect(resp.ok).toBe(true);
  //   expect(resp.timestamp).toBeTruthy();
  //   expect(resp.filter!.subjects).toStrictEqual([363957]);
  //   expect(resp.resources.length > 0).toBeTruthy();
  // });

  // it('should handle timeout', { timeout }, async () => {
  //   const now = new Date();

  //   expect(
  //     await fetchStatus({
  //       retry: 5,
  //       timeout: 1
  //     })
  //   ).toMatchInlineSnapshot(`
  //     {
  //       "ok": false,
  //       "providers": undefined,
  //       "timestamp": undefined,
  //     }
  //   `);

  //   expect(new Date().getTime() - now.getTime()).greaterThanOrEqual(500);
  // });

  // it('should handle abort', { timeout }, async () => {
  //   const now = new Date();
  //   const abort = new AbortController();
  //   setTimeout(() => abort.abort());

  //   expect(
  //     await fetchStatus({
  //       retry: 5,
  //       signal: abort.signal
  //     })
  //   ).toMatchInlineSnapshot(`
  //     {
  //       "ok": false,
  //       "providers": undefined,
  //       "timestamp": undefined,
  //     }
  //   `);

  //   expect(new Date().getTime() - now.getTime()).lessThanOrEqual(100);
  // });
});

describe('fetchStatus Result errors', () => {
  it('classifies rate-limit responses as retryable', async () => {
    const error = await AnimeGardenError.fromResponse(
      'rate limited',
      Response.json({ status: 'ERROR' }, { status: 429, statusText: 'Too Many Requests' })
    );

    expect(error).toMatchObject({ code: 'RATE_LIMITED', retryable: true });
  });

  it('preserves RATE_LIMITED when request timeout interrupts the backoff', async () => {
    const result = await fetchStatus({
      baseURL: 'https://example.com/',
      timeout: 10,
      fetch: vi.fn(async () =>
        Response.json(
          { status: 'ERROR', message: 'slow down' },
          { status: 429, statusText: 'Too Many Requests' }
        )
      )
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'RATE_LIMITED',
      error: {
        status: 429,
        body: { status: 'ERROR', message: 'slow down' },
        retryable: true
      }
    });
  });

  it('returns ABORTED when a rate-limit wait is cancelled', async () => {
    const controller = new AbortController();
    controller.abort(new DOMException('aborted', 'AbortError'));
    const result = await fetchStatus({
      baseURL: 'https://example.com/',
      signal: controller.signal,
      fetch: vi.fn(async () =>
        Response.json({ status: 'ERROR' }, { status: 429, statusText: 'Too Many Requests' })
      )
    });

    // Aborting the rate-limit wait takes precedence over retrying the response.
    expect(result).toMatchObject({ ok: false, code: 'ABORTED' });
  });

  it('maps timeouts to TIMEOUT', async () => {
    const result = await fetchStatus({
      baseURL: 'https://example.com/',
      hooks: { timeout: () => {} },
      fetch: vi.fn(async () => {
        throw new DOMException('timed out', 'TimeoutError');
      })
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'TIMEOUT',
      error: { retryable: true }
    });
  });

  it('rejects 2xx error payloads as INVALID_RESPONSE', async () => {
    const result = await fetchStatus({
      baseURL: 'https://example.com/',
      fetch: vi.fn(async () => Response.json({ status: 'ERROR', message: 'failed' }))
    });

    expect(result).toMatchObject({ ok: false, code: 'INVALID_RESPONSE' });
  });

  it('rejects status payloads with missing provider fields as INVALID_RESPONSE', async () => {
    const result = await fetchStatus({
      baseURL: 'https://example.com/',
      fetch: vi.fn(async () =>
        Response.json({ timestamp: '2026-08-24T00:00:00.000Z', providers: {} })
      )
    });

    expect(result).toMatchObject({ ok: false, code: 'INVALID_RESPONSE' });
  });

  it('rejects non-date response timestamps as INVALID_RESPONSE', async () => {
    const result = await fetchStatus({
      baseURL: 'https://example.com/',
      fetch: vi.fn(async () => Response.json({ timestamp: false, providers: {} }))
    });

    expect(result).toMatchObject({ ok: false, code: 'INVALID_RESPONSE' });
  });

  it('maps malformed JSON to INVALID_RESPONSE', async () => {
    const result = await fetchStatus({
      baseURL: 'https://example.com/',
      fetch: vi.fn(async () => new Response('{invalid json'))
    });

    expect(result).toMatchObject({ ok: false, code: 'INVALID_RESPONSE' });
  });

  it.each([
    { error: new DOMException('aborted', 'AbortError'), code: 'ABORTED', retryable: false },
    { error: new DOMException('timed out', 'TimeoutError'), code: 'TIMEOUT', retryable: true },
    { error: new TypeError('terminated'), code: 'NETWORK_ERROR', retryable: true }
  ])('preserves $code when reading the response body fails', async ({ error, code, retryable }) => {
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.error(error);
        }
      })
    );
    const result = await fetchStatus({
      baseURL: 'https://example.com/',
      fetch: vi.fn(async () => response)
    });

    expect(result).toMatchObject({ ok: false, code, error: { retryable, status: 200 } });
    if (result.ok) throw new Error('Expected body read failure');
    expect(result.error).toBeInstanceOf(AnimeGardenError);
    expect(result.error.response).toBe(response);
    expect(result.error.original).toBe(error);
  });

  it.each([
    { reason: new DOMException('deadline exceeded', 'TimeoutError'), code: 'TIMEOUT' },
    { reason: new Error('cancelled by caller'), code: 'ABORTED' }
  ])(
    'uses $code for the request signal when the body reports AbortError',
    async ({ reason, code }) => {
      const controller = new AbortController();
      const bodyError = new DOMException('body aborted', 'AbortError');
      const response = new Response(
        new ReadableStream({
          start(body) {
            controller.signal.addEventListener('abort', () => body.error(bodyError), {
              once: true
            });
          }
        })
      );
      const result = await fetchStatus({
        baseURL: 'https://example.com/',
        signal: controller.signal,
        fetch: vi.fn(async () => response),
        hooks: { postfetch: () => controller.abort(reason) }
      });

      expect(result).toMatchObject({
        ok: false,
        code,
        error: { retryable: code === 'TIMEOUT', status: 200 }
      });
      if (result.ok) throw new Error('Expected body read failure');
      expect(result.error.original).toBe(bodyError);
    }
  );

  it('keeps user hook exceptions as thrown developer errors', async () => {
    const hookError = new Error('prefetch failed');

    await expect(
      fetchStatus({
        baseURL: 'https://example.com/',
        hooks: {
          prefetch: () => {
            throw hookError;
          }
        },
        fetch: vi.fn()
      })
    ).rejects.toBe(hookError);
  });
});
