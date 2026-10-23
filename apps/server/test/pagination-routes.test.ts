import { createConsola } from 'consola';
import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SupportProviders } from '@animegarden/client';

import { CollectionsModule } from '../src/collections/index';
import { QueryManager } from '../src/resources/query';
import { defineCollectionsRoutes } from '../src/server/routes/collections';
import { defineSubjectsRoutes } from '../src/server/routes/subjects';
import { defineUsersRoutes } from '../src/server/routes/users';
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

/** In-memory metadata lists served by the users, teams and subjects modules. */
const metadataUsers = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  name: `user-${index + 1}`
}));
const metadataTeams = Array.from({ length: 4 }, (_, index) => ({
  id: index + 1,
  name: `team-${index + 1}`
}));
const metadataSubjects = Array.from({ length: 4 }, (_, index) => ({
  id: index + 1,
  name: `subject-${index + 1}`
}));

/** Builds a system whose in-memory metadata modules hold the fixed lists above. */
function createMetadataSystem() {
  const system = {
    modules: {
      users: { ids: new Map(metadataUsers.map((user) => [user.id, user])) },
      teams: { ids: new Map(metadataTeams.map((team) => [team.id, team])) },
      subjects: { activeSubjects: [...metadataSubjects] }
    }
  } as unknown as System;

  const app = new Hono<AppEnv>();
  defineUsersRoutes(system, app);
  defineSubjectsRoutes(system, app);

  return { app, system };
}

type MetadataResponse = {
  status: string;
  pagination?: { page: number; pageSize: number; complete: boolean };
} & Record<string, unknown>;

describe('Metadata endpoints optional pagination', () => {
  const metadataByKey: Record<string, unknown[]> = {
    users: metadataUsers,
    teams: metadataTeams,
    subjects: metadataSubjects
  };

  it.each(['/users', '/teams', '/subjects'])(
    'returns the full list from %s without pagination params',
    async (path) => {
      const { app } = createMetadataSystem();

      const response = await app.request(`http://localhost${path}`);
      const result = (await response.json()) as MetadataResponse;
      const key = path.slice(1);

      expect(response.status).toBe(200);
      expect(result).toEqual({ status: 'OK', [key]: metadataByKey[key] });
      expect(result[key]).toHaveLength(metadataByKey[key].length);
      expect(result).not.toHaveProperty('pagination');
    }
  );

  it.each(['/users', '/teams', '/subjects'])(
    'returns the first page from %s with pageSize=2',
    async (path) => {
      const { app } = createMetadataSystem();
      const key = path.slice(1);

      const response = await app.request(`http://localhost${path}?pageSize=2`);
      const result = (await response.json()) as MetadataResponse;

      expect(response.status).toBe(200);
      expect(result.status).toBe('OK');
      expect(result[key]).toEqual(metadataByKey[key].slice(0, 2));
      expect(result.pagination).toEqual({ page: 1, pageSize: 2, complete: false });
    }
  );

  it.each([
    ['/users', metadataUsers.slice(2, 4), false],
    ['/teams', metadataTeams.slice(2, 4), true],
    ['/subjects', metadataSubjects.slice(2, 4), true]
  ])('returns the second page from %s with page=2&pageSize=2', async (path, expected, complete) => {
    const { app } = createMetadataSystem();
    const key = path.slice(1);

    const response = await app.request(`http://localhost${path}?page=2&pageSize=2`);
    const result = (await response.json()) as MetadataResponse;

    expect(response.status).toBe(200);
    expect(result.status).toBe('OK');
    expect(result[key]).toEqual(expected);
    expect(result.pagination).toEqual({ page: 2, pageSize: 2, complete });
  });

  it('returns the partial last page with complete=true after the full pages', async () => {
    const { app } = createMetadataSystem();

    const response = await app.request('http://localhost/users?page=3&pageSize=2');
    const result = (await response.json()) as MetadataResponse;

    expect(response.status).toBe(200);
    expect(result.users).toEqual([metadataUsers[4]]);
    expect(result.pagination).toEqual({ page: 3, pageSize: 2, complete: true });
  });

  it('returns an empty page with complete=true when the page is beyond the list', async () => {
    const { app } = createMetadataSystem();

    const response = await app.request('http://localhost/users?page=4&pageSize=2');
    const result = (await response.json()) as MetadataResponse;

    expect(response.status).toBe(200);
    expect(result.users).toEqual([]);
    expect(result.pagination).toEqual({ page: 4, pageSize: 2, complete: true });
  });

  it.each(['/users', '/teams', '/subjects'])(
    'falls back to the full unpaginated list from %s for an invalid pageSize',
    async (path) => {
      const { app } = createMetadataSystem();
      const key = path.slice(1);

      const response = await app.request(`http://localhost${path}?pageSize=abc`);
      const result = (await response.json()) as MetadataResponse;

      expect(response.status).toBe(200);
      expect(result[key]).toHaveLength(metadataByKey[key].length);
      expect(result).not.toHaveProperty('pagination');
    }
  );

  it('treats non-positive page numbers as the first page', async () => {
    const { app } = createMetadataSystem();

    const response = await app.request('http://localhost/users?page=0&pageSize=2');
    const result = (await response.json()) as MetadataResponse;

    expect(response.status).toBe(200);
    expect(result.users).toEqual(metadataUsers.slice(0, 2));
    expect(result.pagination).toEqual({ page: 1, pageSize: 2, complete: false });
  });
});
