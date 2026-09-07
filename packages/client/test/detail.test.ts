import { describe, expect, it, vi } from 'vitest';

import { fetchResourceDetail, fetchResourceDetailByInfoHash } from '../src/api/detail';

const resource = {
  id: 1,
  provider: 'dmhy',
  providerId: '1',
  title: 'Resource',
  href: 'https://example.com/1',
  type: '动画',
  magnet: 'magnet:?xt=urn:btih:1',
  size: 1024,
  publisher: { id: 1, name: 'Publisher' },
  createdAt: '2026-06-29T00:00:00.000Z',
  fetchedAt: '2026-06-29T00:00:00.000Z'
};

describe('fetchResourceDetailByInfoHash', () => {
  it('uses the server infohash detail route', async () => {
    const fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          resource,
          timestamp: '2026-06-29T00:00:00.000Z'
        }),
        {
          headers: {
            'content-type': 'application/json'
          }
        }
      );
    });

    const result = await fetchResourceDetailByInfoHash(
      ' 0123456789012345678901234567890123456789 ',
      {
        fetch,
        baseURL: 'https://example.com/'
      }
    );

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/detail/infohash/0123456789012345678901234567890123456789',
      expect.any(Object)
    );
  });

  it('marks missing infohash details as not found', async () => {
    const result = await fetchResourceDetailByInfoHash('0123456789012345678901234567890123456789', {
      baseURL: 'https://example.com/',
      fetch: vi.fn(async () =>
        Response.json({ status: 'ERROR', message: 'missing' }, { status: 404 })
      )
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'NOT_FOUND',
      error: { code: 'NOT_FOUND', retryable: false }
    });
  });
});

describe('fetchResourceDetail', () => {
  it('returns BAD_REQUEST for an empty detail id', async () => {
    const result = await fetchResourceDetail('dmhy', '');

    expect(result).toMatchObject({ ok: false, code: 'BAD_REQUEST' });
  });

  it('marks only HTTP 404 responses as not found', async () => {
    const result = await fetchResourceDetail('dmhy', 'missing', {
      baseURL: 'https://example.com/',
      fetch: vi.fn(async () =>
        Response.json({ status: 'ERROR', message: 'missing' }, { status: 404 })
      )
    });

    expect(result).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });

  it('returns upstream failures as retryable server errors', async () => {
    const result = await fetchResourceDetail('dmhy', 'unavailable', {
      baseURL: 'https://example.com/',
      fetch: vi.fn(async () =>
        Response.json({ status: 'ERROR', message: 'unavailable' }, { status: 503 })
      )
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'SERVER_ERROR',
      error: { status: 503, retryable: true }
    });
  });

  it('returns invalid successful payloads as INVALID_RESPONSE', async () => {
    const result = await fetchResourceDetail('dmhy', 'invalid', {
      baseURL: 'https://example.com/',
      fetch: vi.fn(async () => Response.json({ resource: {} }))
    });

    expect(result).toMatchObject({ ok: false, code: 'INVALID_RESPONSE' });
  });
});
