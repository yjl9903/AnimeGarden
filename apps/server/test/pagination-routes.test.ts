import { createConsola } from 'consola';
import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SupportProviders } from '@animegarden/client';

import { CollectionsModule } from '../src/collections/index';
import { QueryManager } from '../src/resources/query';
import { defineCollectionsRoutes } from '../src/server/routes/collections';
import { defineResourcesRoutes } from '../src/server/routes/resources';
import type { AppEnv } from '../src/server/utils/hono';
import { getResourcesQueryErrorResponse } from '../src/server/utils/resources-query';
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
  app.onError((error, c) => {
    const response = getResourcesQueryErrorResponse(error);
    if (!response) throw error;
    return c.json({ status: 'ERROR', message: response.message }, response.status);
  });

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

describe('resources page path param', () => {
  it.each(
    ['/resources', '/resources/dmhy'].flatMap((base) =>
      ['2abc', '2.5', '2e3', '0x10', '+2', ' 2', '2\n', '0', '-2'].map(
        (page) => `${base}/${encodeURIComponent(page)}`
      )
    )
  )('keeps query or default pagination for the malformed path %s', async (path) => {
    const { app } = createPaginationApp();

    const queryResponse = await app.request(`http://localhost${path}?page=7&pageSize=1`);
    expect(queryResponse.status).toBe(200);
    expect(await queryResponse.json()).toMatchObject({ pagination: { page: 7, pageSize: 1 } });

    const defaultResponse = await app.request(`http://localhost${path}?pageSize=1`);
    expect(defaultResponse.status).toBe(200);
    expect(await defaultResponse.json()).toMatchObject({ pagination: { page: 1, pageSize: 1 } });
  });

  it('keeps body pagination when the path is malformed and the query omits page', async () => {
    const { app, find } = createPaginationApp();
    const response = await app.request('http://localhost/resources/2abc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 7, pageSize: 1 })
    });

    expect(response.status).toBe(200);
    expect(find).toHaveBeenCalledWith({}, { page: 7, pageSize: 1 });
  });

  it.each(['/resources', '/resources/dmhy'])(
    'checks the path page against the deep-pagination boundary for %s',
    async (base) => {
      const { app, find } = createPaginationApp();
      const allowed = await app.request(`http://localhost${base}/10000?page=1&pageSize=1`);

      expect(allowed.status).toBe(200);
      expect(await allowed.json()).toMatchObject({ pagination: { page: 10000, pageSize: 1 } });

      find.mockClear();
      const rejected = await app.request(`http://localhost${base}/10001?page=1&pageSize=1`);

      expect(rejected.status).toBe(400);
      expect(await rejected.json()).toMatchObject({ status: 'ERROR' });
      expect(find).not.toHaveBeenCalled();
    }
  );

  it.each(['2', '02'])('honors the page path param for /resources/%s', async (page) => {
    const { app, find } = createPaginationApp();

    const response = await app.request(`http://localhost/resources/${page}?pageSize=1`);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      status: 'OK',
      pagination: { page: 2, pageSize: 1, complete: true }
    });
    expect(find).toHaveBeenCalledWith({}, { page: 2, pageSize: 1 });
  });

  it('honors the page path param with provider for /resources/:provider/:page', async () => {
    const { app, find } = createPaginationApp();

    const response = await app.request('http://localhost/resources/dmhy/2?pageSize=1');
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      status: 'OK',
      filter: { provider: 'dmhy' },
      pagination: { page: 2, pageSize: 1, complete: true }
    });
    expect(find).toHaveBeenCalledWith({ provider: 'dmhy' }, { page: 2, pageSize: 1 });
  });

  it('honors the page path param over the page query param', async () => {
    const { app } = createPaginationApp();

    const response = await app.request('http://localhost/resources/3?page=2&pageSize=1');
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({ pagination: { page: 3, pageSize: 1 } });
  });

  it('falls back to the page query param when the page path param is not a number', async () => {
    const { app } = createPaginationApp();

    const response = await app.request('http://localhost/resources/abc?page=2&pageSize=1');
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({ pagination: { page: 2, pageSize: 1 } });
  });

  it('falls back to the first page when the page path param is invalid', async () => {
    const { app } = createPaginationApp();

    for (const path of ['/resources/abc', '/resources/dmhy/abc']) {
      const response = await app.request(`http://localhost${path}?pageSize=1`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toMatchObject({ pagination: { page: 1, pageSize: 1 } });
    }
  });
});

describe('resources provider routes', () => {
  it.each(
    SupportProviders.flatMap((provider) =>
      ['', '/', '/2'].map((suffix) => ({ provider, path: `/resources/${provider}${suffix}` }))
    )
  )('preserves the provider filter for $path', async ({ provider, path }) => {
    const { app, find } = createPaginationApp();
    const response = await app.request(`http://localhost${path}?page=2&pageSize=1`);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      filter: { provider },
      pagination: { page: 2, pageSize: 1 }
    });
    expect(find).toHaveBeenCalledWith({ provider }, { page: 2, pageSize: 1 });
  });
});
