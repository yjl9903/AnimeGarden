import { createConsola } from 'consola';
import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SupportProviders } from '@animegarden/client';

import { CollectionsModule } from '../src/collections/index';
import { QueryManager } from '../src/resources/query';
import { defineCollectionsRoutes } from '../src/server/routes/collections';
import { defineResourcesRoutes } from '../src/server/routes/resources';
import type { AppEnv } from '../src/server/utils/hono';
import type { System } from '../src/system/index';

/** The query payload shared by resource lists and individual collection results. */
type ResourceQueryResult = Awaited<ReturnType<QueryManager['find']>>;

const savedFilters = [
  { name: '动画', searchParams: '?type=动画', types: ['动画'] },
  { name: '音乐', searchParams: '?type=音乐', types: ['音乐'] }
];

/** Exercises the actual query response builder and collection module above mocked data reads. */
function createPaginationApp() {
  const where = vi.fn().mockResolvedValue([
    {
      hash: 'collection-hash',
      name: '收藏夹',
      createdAt: new Date('2026-09-08T00:00:00.000Z'),
      filters: savedFilters
    }
  ]);
  const system = {
    database: { select: vi.fn(() => ({ from: vi.fn(() => ({ where })) })) },
    modules: { users: {}, teams: {} }
  } as unknown as System;
  const query = new QueryManager(system, createConsola({ level: 0 }));
  const find = vi.spyOn(query, 'find');
  vi.spyOn(query, 'findFromTask').mockImplementation(async (filter) => ({
    resources: [],
    hasMore: filter.types?.includes('动画') === true
  }));
  system.modules.resources = { query } as System['modules']['resources'];
  system.modules.collections = new CollectionsModule(system, 'collections');
  vi.spyOn(system.modules.collections.logger, 'info').mockImplementation(() => {});

  const app = new Hono<AppEnv>();
  defineResourcesRoutes(system, app);
  defineCollectionsRoutes(system, app);

  return { app, find };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('API pagination response contract', () => {
  it.each([
    '/resources',
    '/resources/',
    '/resources/2',
    ...SupportProviders.flatMap((provider) => [
      `/resources/${provider}`,
      `/resources/${provider}/`,
      `/resources/${provider}/2`
    ])
  ])('returns pagination without a sibling complete field from %s', async (path) => {
    const { app } = createPaginationApp();

    const response = await app.request(`http://localhost${path}?page=2&pageSize=20&type=动画`);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      status: 'OK',
      resources: [],
      pagination: { page: 2, pageSize: 20, complete: false }
    });
    expect(result).not.toHaveProperty('complete');
  });

  it('keeps collection result pagination identical to resource lists for each saved filter', async () => {
    const { app, find } = createPaginationApp();
    const response = await app.request('http://localhost/collection/collection-hash');
    const collection = (await response.json()) as { results: ResourceQueryResult[] };

    expect(response.status).toBe(200);
    expect(collection.results).toHaveLength(savedFilters.length);
    expect(collection.results.map((result) => result.pagination)).toEqual([
      { page: 1, pageSize: 1000, complete: false },
      { page: 1, pageSize: 1000, complete: true }
    ]);

    // Collection retrieval continues querying the first 1000 resources per saved filter.
    for (const [index, filter] of savedFilters.entries()) {
      expect(find).toHaveBeenNthCalledWith(index + 1, filter, { page: 1, pageSize: 1000 });
      const listResponse = await app.request(
        `http://localhost/resources?page=1&pageSize=1000&type=${encodeURIComponent(filter.types[0])}`
      );
      const { status, ...listResult } = (await listResponse.json()) as ResourceQueryResult & {
        status: string;
      };

      expect(status).toBe('OK');
      expect(collection.results[index]).toEqual(listResult);
      expect(collection.results[index]).not.toHaveProperty('complete');
    }
  });
});
