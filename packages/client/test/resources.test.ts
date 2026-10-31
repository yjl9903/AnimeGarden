import { describe, expect, it, vi } from 'vitest';

import { fetchAPI } from '../src/api/base';
import { AnimeGardenError } from '../src/error';
import { fetchResources } from '../src/api/resources';

function createResource(id: number) {
  return {
    id,
    provider: 'dmhy',
    providerId: String(id),
    title: `Resource ${id}`,
    href: `https://example.com/${id}`,
    type: '动画',
    magnet: `magnet:?xt=urn:btih:${id}`,
    tracker: undefined,
    size: 1024,
    publisher: {
      id: 1,
      name: 'publisher'
    },
    createdAt: '2026-05-08T00:00:00.000Z',
    fetchedAt: '2026-05-08T00:00:00.000Z'
  };
}

function createResourcesResponse(resources: Array<ReturnType<typeof createResource>>) {
  return {
    resources,
    pagination: {
      anchor: Date.parse('2026-05-08T00:00:00.000Z'),
      limit: Math.max(1, resources.length),
      nextCursor: resources.length > 0 ? `cursor-${resources.at(-1)!.id}` : null,
      complete: resources.length === 0
    },
    filter: {},
    timestamp: '2026-05-08T00:00:00.000Z'
  };
}

/** A fetch mock following the opaque continuation and requested batch limit. */
function createPaginatedFetchMock() {
  return vi.fn(async (input: unknown) => {
    const url = new URL(String(input));
    const offset = Number(url.searchParams.get('cursor')?.replace('cursor-', '') ?? '0');
    const limit = Number(url.searchParams.get('limit') ?? '100');
    const resources = Array.from({ length: limit }, (_, index) =>
      createResource(offset + index + 1)
    );
    return Response.json({
      resources,
      pagination: {
        anchor: Date.parse('2026-05-08T00:00:00.000Z'),
        limit,
        nextCursor: `cursor-${offset + limit}`,
        complete: false
      },
      filter: {},
      timestamp: '2026-05-08T00:00:00.000Z'
    });
  });
}

describe('fetchResources', () => {
  it.each([101, 1000])(
    'fetches limit=%s in one request and accepts its pagination',
    async (limit) => {
      const fetch = createPaginatedFetchMock();
      const result = await fetchResources({ fetch, baseURL: 'https://example.com/', limit });
      expect(result.ok).toBe(true);
      expect(result.resources).toHaveLength(limit);
      expect(result.pagination?.limit).toBe(limit);
      expect(result.pagination?.nextCursor).toBe(`cursor-${limit}`);
      expect(fetch).toHaveBeenCalledOnce();
    }
  );

  it('requests exactly the default batch without skipping resources in its continuation', async () => {
    const fetch = createPaginatedFetchMock();
    const result = await fetchResources({ fetch, baseURL: 'https://example.com/' });
    expect(result.ok).toBe(true);
    expect(result.resources).toHaveLength(30);
    expect(result.pagination?.nextCursor).toBe('cursor-30');
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('passes through opaque cursors without adding an anchor request parameter', async () => {
    const fetch = createPaginatedFetchMock();
    const result = await fetchResources({
      fetch,
      baseURL: 'https://example.com/',
      count: 31,
      limit: 30,
      cursor: 'cursor-0'
    });
    const searches = fetch.mock.calls.map(([input]) => new URL(String(input)).searchParams);
    expect(result.resources).toHaveLength(31);
    expect(searches[0].get('anchor')).toBeNull();
    expect(searches[0].get('cursor')).toBe('cursor-0');
    expect(searches[1].get('anchor')).toBeNull();
    expect(searches[1].get('cursor')).toBe('cursor-30');
    expect(result.pagination?.nextCursor).toBe('cursor-31');
  });

  it('rejects repeated cursors instead of looping forever', async () => {
    const fetch = vi.fn(async () => Response.json(createResourcesResponse([createResource(1)])));
    const result = await fetchResources({ fetch, baseURL: 'https://example.com/', count: -1 });
    expect(result).toMatchObject({ ok: false, code: 'INVALID_RESPONSE' });
    expect(result.resources).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    { anchor: 'invalid' },
    { anchor: '2026-05-08T00:00:00.000Z' },
    { anchor: null },
    { anchor: false },
    { anchor: 1.5 },
    { anchor: 8640000000000001 },
    { nextCursor: null, complete: false },
    { nextCursor: 'next', complete: true },
    { nextCursor: '', complete: false },
    { limit: 0 },
    { limit: 1001 }
  ])('rejects malformed cursor pagination %j', async (pagination) => {
    const response = createResourcesResponse([createResource(1)]);
    const result = await fetchResources({
      baseURL: 'https://example.com/',
      fetch: async () =>
        Response.json({
          ...response,
          pagination: { ...response.pagination, ...pagination }
        })
    });
    expect(result).toMatchObject({ ok: false, code: 'INVALID_RESPONSE' });
  });

  it('fetches pagination for count zero but returns no resources', async () => {
    const response = createResourcesResponse([createResource(1)]);
    const progress = vi.fn();
    const fetch = vi.fn(async (_input: string | URL | Request) =>
      Promise.resolve(
        new Response(JSON.stringify(response), {
          headers: {
            'content-type': 'application/json',
            'x-response-timestamp': '2026-05-08T00:00:00.000Z'
          }
        })
      )
    );

    const result = await fetchResources({
      fetch,
      baseURL: 'https://example.com/',
      count: 0,
      progress
    });

    expect(result.ok).toBe(true);
    expect(result.resources).toEqual([]);
    expect(result.pagination).toMatchObject({
      complete: false,
      nextCursor: 'cursor-1'
    });
    expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get('limit')).toBe('1000');
    expect(progress).not.toHaveBeenCalled();
  });

  it('uses the remaining finite count as the request limit', async () => {
    const fetch = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      const limit = Number(url.searchParams.get('limit'));
      const resources = Array.from({ length: limit }, (_, index) => createResource(index + 1));

      return new Response(JSON.stringify(createResourcesResponse(resources)), {
        headers: {
          'content-type': 'application/json',
          'x-response-timestamp': '2026-05-08T00:00:00.000Z'
        }
      });
    });

    const result = await fetchResources({
      fetch,
      baseURL: 'https://example.com/',
      count: 30
    });

    expect(result.ok).toBe(true);
    expect(result.resources).toHaveLength(30);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get('limit')).toBe('30');
  });

  it('returns ok false when the first page request fails', async () => {
    const fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ status: 'ERROR' }), {
        status: 500,
        statusText: 'Internal Server Error'
      });
    });

    const result = await fetchResources({
      fetch,
      baseURL: 'https://example.com/',
      retry: 0
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure');
    expect(result.code).toBe('SERVER_ERROR');
    expect(result.resources).toEqual([]);
    expect(result.error).toBeInstanceOf(AnimeGardenError);
    expect(result.error?.status).toBe(500);
    expect(result.error?.body).toEqual({ status: 'ERROR' });
    expect(result.error?.cause).toBeUndefined();
    expect(result.error?.message).toContain('500 Internal Server Error');
  });

  it('keeps partial resources but marks the result failed when a later batch fails', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(createResourcesResponse([createResource(1)])), {
          headers: {
            'content-type': 'application/json',
            'x-response-timestamp': '2026-05-08T00:00:00.000Z'
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'ERROR' }), {
          status: 503,
          statusText: 'Service Unavailable'
        })
      );

    const result = await fetchResources({
      fetch,
      baseURL: 'https://example.com/',
      count: 2,
      limit: 1,
      retry: 0
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure');
    expect(result.code).toBe('SERVER_ERROR');
    expect(result.resources).toHaveLength(1);
    expect(result.pagination?.anchor).toEqual(Date.parse('2026-05-08T00:00:00.000Z'));
    expect(result.timestamp).toEqual(new Date('2026-05-08T00:00:00.000Z'));
    expect(result.error).toBeInstanceOf(AnimeGardenError);
    expect(result.error?.status).toBe(503);
    expect(result.error?.body).toEqual({ status: 'ERROR' });
    expect(result.error?.message).toContain('503 Service Unavailable');
  });

  it('wraps original fetch errors in AnimeGardenError', async () => {
    const original = new TypeError('network failed');

    await expect(
      fetchAPI('resources', undefined, {
        fetch: vi.fn(async () => {
          throw original;
        }),
        baseURL: 'https://example.com/',
        retry: 0
      })
    ).rejects.toMatchObject({
      name: 'AnimeGardenError',
      message: 'network failed',
      cause: original,
      original
    });
  });

  it('does not wait through a rate-limit sleep after aborting', async () => {
    const reason = new DOMException('aborted', 'AbortError');
    const controller = new AbortController();
    controller.abort(reason);

    await expect(
      fetchAPI('resources', undefined, {
        fetch: vi.fn(async () => {
          return new Response(JSON.stringify({ status: 'ERROR' }), {
            status: 429,
            statusText: 'Too Many Requests'
          });
        }),
        baseURL: 'https://example.com/',
        retry: 0,
        signal: controller.signal
      })
    ).rejects.toBe(reason);
  });

  it('returns network failures through the high-level Result', async () => {
    const result = await fetchResources({
      fetch: vi.fn(async () => {
        throw new TypeError('network failed');
      }),
      baseURL: 'https://example.com/'
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'NETWORK_ERROR',
      error: { retryable: true },
      resources: []
    });
  });

  it('returns INVALID_RESPONSE for malformed pagination metadata', async () => {
    const response = createResourcesResponse([createResource(1)]);
    response.pagination.complete = 'no' as unknown as boolean;

    const result = await fetchResources({
      fetch: vi.fn(async () => Response.json(response)),
      baseURL: 'https://example.com/'
    });

    expect(result).toMatchObject({ ok: false, code: 'INVALID_RESPONSE', resources: [] });
  });

  it('returns INVALID_RESPONSE for invalid serialized filter dates', async () => {
    const response = {
      ...createResourcesResponse([createResource(1)]),
      filter: { after: 'not-a-date' }
    };

    const result = await fetchResources({
      fetch: vi.fn(async () => Response.json(response)),
      baseURL: 'https://example.com/'
    });

    expect(result).toMatchObject({ ok: false, code: 'INVALID_RESPONSE', resources: [] });
  });

  it.each([
    ['createdAt', null],
    ['createdAt', false],
    ['fetchedAt', true]
  ])('rejects a non-date %s value of %j', async (field, value) => {
    const resource = { ...createResource(1), [field]: value };
    const result = await fetchResources({
      fetch: vi.fn(async () =>
        Response.json(
          createResourcesResponse([resource as unknown as ReturnType<typeof createResource>])
        )
      ),
      baseURL: 'https://example.com/'
    });

    expect(result).toMatchObject({ ok: false, code: 'INVALID_RESPONSE', resources: [] });
  });

  it('rejects null filter dates instead of preserving them as resolved values', async () => {
    const response = {
      ...createResourcesResponse([createResource(1)]),
      filter: { before: null }
    };
    const result = await fetchResources({
      fetch: vi.fn(async () => Response.json(response)),
      baseURL: 'https://example.com/'
    });

    expect(result).toMatchObject({ ok: false, code: 'INVALID_RESPONSE', resources: [] });
  });

  it('returns ABORTED before requesting when the signal is already cancelled', async () => {
    const controller = new AbortController();
    controller.abort('cancelled');
    const fetch = vi.fn();

    const result = await fetchResources({
      fetch,
      baseURL: 'https://example.com/',
      signal: controller.signal
    });

    expect(result).toMatchObject({ ok: false, code: 'ABORTED', resources: [] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not swallow progress callback errors', async () => {
    const callbackError = new Error('progress failed');

    await expect(
      fetchResources({
        fetch: vi.fn(async () => Response.json(createResourcesResponse([createResource(1)]))),
        baseURL: 'https://example.com/',
        progress: () => {
          throw callbackError;
        }
      })
    ).rejects.toBe(callbackError);
  });

  it('respects an explicit limit and uses the remaining count for the final batch', async () => {
    const fetch = createPaginatedFetchMock();

    const result = await fetchResources({
      fetch,
      baseURL: 'https://example.com/',
      limit: 30,
      count: 100
    });

    expect(result.ok).toBe(true);
    // The final cursor must point after the last returned resource, not an overfetched batch.
    expect(fetch).toHaveBeenCalledTimes(4);
    const pages = fetch.mock.calls.map((call) => new URL(String(call[0])).searchParams);
    expect(pages.map((params) => params.get('cursor'))).toEqual([
      null,
      'cursor-30',
      'cursor-60',
      'cursor-90'
    ]);
    expect(pages.map((params) => params.get('limit'))).toEqual(['30', '30', '30', '10']);
  });

  it('returns continuation metadata for the last fetched batch', async () => {
    const fetch = createPaginatedFetchMock();

    const result = await fetchResources({
      fetch,
      baseURL: 'https://example.com/',
      limit: 30,
      count: 100
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.nextCursor).toBe('cursor-100');
  });

  it('requests with the maximum limit when no limit is specified', async () => {
    const fetch = createPaginatedFetchMock();

    const result = await fetchResources({
      fetch,
      baseURL: 'https://example.com/',
      count: 100
    });

    expect(result.ok).toBe(true);
    // One full batch satisfies count = 100.
    expect(fetch).toHaveBeenCalledTimes(1);
    const params = new URL(String(fetch.mock.calls[0][0])).searchParams;
    expect(params.get('limit')).toBe('100');
    if (!result.ok) throw new Error('Expected success');
    expect(result.pagination.limit).toBe(100);
  });
});
