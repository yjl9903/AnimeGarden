import { createConsola } from 'consola';
import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SupportProviders } from '@animegarden/client';

import { CollectionsModule } from '../src/collections/index';
import { QueryManager } from '../src/resources/query';
import { encodeResourcesCursor } from '@animegarden/shared';
import { defineCollectionsRoutes } from '../src/server/routes/collections';
import { defineResourcesRoutes } from '../src/server/routes/resources';
import type { AppEnv } from '../src/server/utils/hono';
import { getResourcesQueryErrorResponse } from '../src/server/utils/resources-query';
import type { System } from '../src/system/index';

const anchor = new Date('2026-09-08T00:00:00.000Z');
const savedFilters = [
  { name: '动画', searchParams: '?type=动画', types: ['动画'] },
  { name: '音乐', searchParams: '?type=音乐', types: ['音乐'] }
];

/** Exercises the real query response builder and collection module above mocked data reads. */
function createPaginationApp() {
  const where = vi
    .fn()
    .mockResolvedValue([
      { hash: 'collection-hash', name: '收藏夹', createdAt: anchor, filters: savedFilters }
    ]);
  const system = {
    database: { select: vi.fn(() => ({ from: vi.fn(() => ({ where })) })) },
    modules: { users: {}, teams: {}, providers: { timestamp: anchor } }
  } as unknown as System;
  const query = new QueryManager(system, createConsola({ level: 0 }));
  const find = vi.spyOn(query, 'find');
  vi.spyOn(query, 'findFromTask').mockResolvedValue([]);
  system.modules.resources = { query } as System['modules']['resources'];
  system.modules.collections = new CollectionsModule(system, 'collections');
  vi.spyOn(system.modules.collections.logger, 'info').mockImplementation(() => {});

  const app = new Hono<AppEnv>();
  defineResourcesRoutes(system, app);
  defineCollectionsRoutes(system, app);
  app.onError((error, c) => {
    const response = getResourcesQueryErrorResponse(error);
    if (!response) throw error;
    c.header('Cache-Control', 'no-store');
    return c.json({ status: 'ERROR', message: response.message }, response.status);
  });
  return { app, find };
}

afterEach(() => vi.restoreAllMocks());

describe('API cursor response contract', () => {
  it('rejects an undecodable cursor without caching errors', async () => {
    const { app, find } = createPaginationApp();
    const response = await app.request('http://localhost/resources?cursor=garbage');
    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(find).not.toHaveBeenCalled();
  });

  it.each([undefined, { createdAt: anchor.getTime(), id: 1 }])(
    'accepts cursor anchors ahead of the provider timestamp (position: %j)',
    async (position) => {
      const { app, find } = createPaginationApp();
      const cursor = encodeResourcesCursor({ anchor: anchor.getTime() + 1000, position });
      const response = await app.request(`http://localhost/resources?cursor=${cursor}`);
      expect(response.status).toBe(200);
      expect(find).toHaveBeenCalledExactlyOnceWith(
        {},
        {
          limit: 30,
          cursor: {
            anchor: anchor.getTime() + 1000,
            ...(position ? { position } : {})
          }
        }
      );
      expect(await response.json()).toMatchObject({
        pagination: { anchor: anchor.getTime() + 1000 }
      });
    }
  );

  it.each([undefined, { createdAt: anchor.getTime() - 1000, id: 42 }])(
    'passes decoded pagination to find with exactly two arguments (position: %j)',
    async (position) => {
      const { app, find } = createPaginationApp();
      const cursor = { anchor: anchor.getTime(), ...(position ? { position } : {}) };
      const response = await app.request(
        `http://localhost/resources?limit=2.4&type=动画&cursor=${encodeResourcesCursor(cursor)}`
      );
      expect(response.status).toBe(200);
      expect(find).toHaveBeenCalledExactlyOnceWith({ types: ['动画'] }, { limit: 2, cursor });
    }
  );

  it('distinguishes latest, anchored and continuation cache lifetimes', async () => {
    const { app } = createPaginationApp();
    const cursor = encodeResourcesCursor({
      anchor: anchor.getTime(),
      position: { createdAt: anchor.getTime(), id: 1 }
    });
    for (const [search, cache] of [
      ['', 'public, max-age=60, stale-while-revalidate=300'],
      [
        `cursor=${encodeResourcesCursor({ anchor: anchor.getTime() })}`,
        'public, max-age=600, stale-while-revalidate=3600'
      ],
      [`cursor=${cursor}`, 'public, max-age=1800, stale-while-revalidate=86400']
    ]) {
      const response = await app.request(`http://localhost/resources?${search}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe(cache);
    }
  });

  it.each([
    '/resources',
    '/resources/',
    ...SupportProviders.flatMap((provider) => [`/resources/${provider}`, `/resources/${provider}/`])
  ])('returns cursor pagination without sibling complete from %s', async (path) => {
    const { app } = createPaginationApp();
    const response = await app.request(`http://localhost${path}?limit=20&type=动画`);
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      status: 'OK',
      resources: [],
      pagination: { anchor: anchor.getTime(), limit: 20, complete: true, nextCursor: null }
    });
    expect(result).not.toHaveProperty('complete');
  });

  it('keeps collection pagination identical to the first resource batch', async () => {
    const { app, find } = createPaginationApp();
    const response = await app.request('http://localhost/collection/collection-hash');
    const collection = (await response.json()) as {
      results: Awaited<ReturnType<QueryManager['find']>>[];
    };
    expect(response.status).toBe(200);
    expect(collection.results).toHaveLength(savedFilters.length);

    for (const [index, filter] of savedFilters.entries()) {
      expect(find).toHaveBeenNthCalledWith(index + 1, filter, { limit: 100 });
    }
    for (const [index, filter] of savedFilters.entries()) {
      const listResponse = await app.request(
        `http://localhost/resources?limit=100&type=${encodeURIComponent(filter.types[0])}`
      );
      const { status, ...listResult } = (await listResponse.json()) as Awaited<
        ReturnType<QueryManager['find']>
      > & { status: string };
      expect(status).toBe('OK');
      expect(collection.results[index]).toEqual(listResult);
    }
  });

  it.each(['page=1', 'pageSize=30'])('rejects legacy query parameter %s', async (search) => {
    const { app, find } = createPaginationApp();
    const response = await app.request(`http://localhost/resources?${search}`);
    expect(response.status).toBe(400);
    expect(find).not.toHaveBeenCalled();
  });

  it('rejects legacy body pagination before querying', async () => {
    const { app, find } = createPaginationApp();
    const response = await app.request('http://localhost/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 7, pageSize: 1 })
    });
    expect(response.status).toBe(400);
    expect(find).not.toHaveBeenCalled();
  });

  it.each(['/resources/2', '/resources/abc', '/resources/dmhy/2', '/resources/dmhy/abc'])(
    'does not silently return the first batch for removed route %s',
    async (path) => {
      const { app, find } = createPaginationApp();
      expect((await app.request(`http://localhost${path}`)).status).toBe(404);
      expect(find).not.toHaveBeenCalled();
    }
  );

  it.each(SupportProviders)('preserves provider route priority for %s', async (provider) => {
    const { app, find } = createPaginationApp();
    const response = await app.request(`http://localhost/resources/${provider}?limit=1`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ filter: { provider } });
    expect(find).toHaveBeenCalledWith({ provider }, { limit: 1 });
  });
});
