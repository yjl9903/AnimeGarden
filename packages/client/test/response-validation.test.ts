import { describe, expect, it } from 'vitest';

import { fetchAPI } from '../src/api/base';
import { fetchCollection, generateCollection } from '../src/api/collection';
import { fetchResourceDetail, fetchResourceDetailByInfoHash } from '../src/api/detail';
import { fetchResources } from '../src/api/resources';
import { fetchStatus } from '../src/api/status';
import type { FetchOptions } from '../src/types';

const highLevelAPIs = {
  fetchStatus,
  fetchResources,
  fetchCollection: (options: FetchOptions) => fetchCollection('collection-hash', options),
  generateCollection: (options: FetchOptions) =>
    generateCollection(
      {
        name: 'Collection',
        authorization: 'authorization',
        filters: [{ name: 'Filter', searchParams: 'subject=1234', subjects: [1234] }]
      },
      options
    ),
  fetchResourceDetail: (options: FetchOptions) => fetchResourceDetail('dmhy', '1', options),
  fetchResourceDetailByInfoHash: (options: FetchOptions) =>
    fetchResourceDetailByInfoHash('0123456789012345678901234567890123456789', options)
};

describe.each(Object.entries(highLevelAPIs))('%s top-level response validation', (_name, call) => {
  it.each([null, false, 42, 'invalid', []].map((body) => ({ body })))(
    'returns INVALID_RESPONSE for the JSON value $body',
    async ({ body }) => {
      const result = await call({
        baseURL: 'https://example.com/',
        fetch: async () => Response.json(body)
      });

      expect(result).toMatchObject({
        ok: false,
        code: 'INVALID_RESPONSE',
        error: { code: 'INVALID_RESPONSE', retryable: false }
      });
    }
  );
});

describe('fetchAPI JSON primitives', () => {
  it.each([null, false, 42, 'value'])('preserves the JSON value %j', async (body) => {
    await expect(
      fetchAPI<typeof body>('/', undefined, {
        baseURL: 'https://example.com/',
        fetch: async () => Response.json(body)
      })
    ).resolves.toBe(body);
  });
});
