import { describe, expect, it, vi } from 'vitest';

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
    expect(result.resources).toEqual([]);
    expect(result.error).toBeInstanceOf(Error);
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
    expect(result.resources).toHaveLength(1);
    expect(result.error?.message).toContain('503 Service Unavailable');
  });
});
