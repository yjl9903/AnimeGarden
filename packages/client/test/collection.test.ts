import { describe, expect, it, vi } from 'vitest';

import { fetchCollection, generateCollection, hashCollection } from '../src';
import type { CollectionFilter } from '../src';

function createCollectionResponse(complete: boolean) {
  return {
    status: 'OK',
    hash: 'collection-hash',
    name: '收藏夹',
    createdAt: '2026-08-24T00:00:00.000Z',
    filters: [{ name: '动画', searchParams: 'type=动画', types: ['动画'] }],
    results: [
      {
        resources: [
          {
            id: 1,
            provider: 'dmhy',
            providerId: '1',
            title: 'Resource',
            href: 'https://example.com/1',
            type: '动画',
            magnet: 'magnet:?xt=urn:btih:0123456789012345678901234567890123456789',
            size: 1024,
            publisher: { id: 1, name: 'publisher' },
            createdAt: '2026-08-24T00:00:00.000Z',
            fetchedAt: '2026-08-24T00:00:00.000Z'
          }
        ],
        pagination: { page: 1, pageSize: 1000, complete },
        filter: { types: ['动画'], after: '2026-08-01T00:00:00.000Z' }
      }
    ],
    timestamp: '2026-08-24T00:00:00.000Z'
  };
}

describe('collection', () => {
  it('should hash collection', async () => {
    expect(
      await hashCollection({
        name: '收藏夹',
        authorization: 'b7f69b00-57c2-408b-a623-ee2c46d24db2',
        filters: [
          {
            subjects: [513018],
            fansubs: ['ANi'],
            after: new Date('2025-03-24T16:00:00.000Z'),
            name: '',
            searchParams: '?after=1742832000000&fansub=ANi&subject=513018'
          }
        ]
      })
    ).toMatchInlineSnapshot(`"659751637474909a53073b44cd7a70fd189b0866"`);
  });

  it('returns NOT_FOUND for missing collections', async () => {
    const result = await fetchCollection('missing', {
      baseURL: 'https://example.com/',
      fetch: vi.fn(async () =>
        Response.json({ status: 'ERROR', message: 'missing' }, { status: 404 })
      )
    });

    expect(result).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });

  it.each([true, false])(
    'accepts collection results with pagination.complete=%s',
    async (complete) => {
      const result = await fetchCollection('collection-hash', {
        baseURL: 'https://example.com/',
        fetch: vi.fn(async () => Response.json(createCollectionResponse(complete)))
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw result.error;
      const item = result.results[0];
      expect(item.pagination).toEqual({ page: 1, pageSize: 1000, complete });
      expect(item).not.toHaveProperty('complete');
      expect(item.resources[0].createdAt).toEqual(new Date('2026-08-24T00:00:00.000Z'));
      expect(item.filter?.after).toEqual(new Date('2026-08-01T00:00:00.000Z'));
    }
  );

  it('rejects the legacy collection result shape without pagination', async () => {
    const response = createCollectionResponse(true);
    const result = await fetchCollection('collection-hash', {
      baseURL: 'https://example.com/',
      fetch: vi.fn(async () =>
        Response.json({
          ...response,
          results: response.results.map(({ pagination, ...item }) => ({
            ...item,
            complete: pagination.complete
          }))
        })
      )
    });

    expect(result).toMatchObject({ ok: false, code: 'INVALID_RESPONSE' });
  });

  it('returns BAD_REQUEST for an empty collection hash', async () => {
    const result = await fetchCollection('');

    expect(result).toMatchObject({ ok: false, code: 'BAD_REQUEST' });
  });

  it('returns collection service failures as SERVER_ERROR', async () => {
    const result = await fetchCollection('unavailable', {
      baseURL: 'https://example.com/',
      fetch: vi.fn(async () =>
        Response.json({ status: 'ERROR', message: 'unavailable' }, { status: 503 })
      )
    });

    expect(result).toMatchObject({ ok: false, code: 'SERVER_ERROR' });
  });

  it('returns INVALID_RESPONSE for malformed collection result fields', async () => {
    const result = await fetchCollection('invalid', {
      baseURL: 'https://example.com/',
      fetch: vi.fn(async () =>
        Response.json({
          hash: 'invalid',
          name: '收藏夹',
          createdAt: '2026-08-24T00:00:00.000Z',
          filters: [],
          results: [{ resources: [], pagination: { page: 1, pageSize: 1000, complete: 'no' } }],
          timestamp: '2026-08-24T00:00:00.000Z'
        })
      )
    });

    expect(result).toMatchObject({ ok: false, code: 'INVALID_RESPONSE' });
  });

  it('does not swallow collection generation failures', async () => {
    const result = await generateCollection(
      {
        name: '收藏夹',
        authorization: 'authorization',
        filters: []
      },
      {
        baseURL: 'https://example.com/',
        fetch: vi.fn(async () =>
          Response.json({ status: 'ERROR', message: 'invalid' }, { status: 400 })
        )
      }
    );

    expect(result).toMatchObject({ ok: false, code: 'BAD_REQUEST' });
  });

  it('excludes query results and pagination from collection hashes and generation requests', async () => {
    const filter = { name: '动画', searchParams: 'subject=1234', subjects: [1234] };
    const queriedFilter: CollectionFilter<true, true> = {
      ...filter,
      resources: [],
      pagination: { page: 1, pageSize: 1000, complete: true }
    };
    const collection = { name: '收藏夹', authorization: 'authorization', filters: [filter] };
    const queriedCollection = { ...collection, filters: [queriedFilter] };

    expect(await hashCollection(queriedCollection)).toBe(await hashCollection(collection));

    const fetch = vi.fn(async (_url: string | RequestInfo, init?: RequestInit) => {
      expect(JSON.parse(init?.body as string)).toEqual(collection);
      return Response.json({
        hash: 'collection-hash',
        createdAt: '2026-08-24T00:00:00.000Z',
        timestamp: '2026-08-24T00:00:00.000Z'
      });
    });
    const result = await generateCollection(queriedCollection, {
      baseURL: 'https://example.com/',
      fetch
    });

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
  });
});
