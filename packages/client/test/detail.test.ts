import { describe, expect, it, vi } from 'vitest';

import { fetchResourceDetailByInfoHash } from '../src/api/detail';

describe('fetchResourceDetailByInfoHash', () => {
  it('uses the server infohash detail route', async () => {
    const fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          resource: {},
          detail: {},
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
});
