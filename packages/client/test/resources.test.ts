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
      page: 1,
      pageSize: resources.length,
      complete: false
    },
    filter: {},
    timestamp: '2026-05-08T00:00:00.000Z'
  };
}

describe('fetchResources', () => {
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

  it('keeps partial resources but marks the result failed when a later page fails', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(createResourcesResponse([createResource(1)])), {
          headers: {
            'content-type': 'application/json'
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
      pageSize: 1,
      retry: 0
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure');
    expect(result.code).toBe('SERVER_ERROR');
    expect(result.resources).toHaveLength(1);
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
});
