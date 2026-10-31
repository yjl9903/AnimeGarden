import { afterEach, describe, expect, it, vi } from 'vitest';
import { hash } from 'ohash';
import type { SQLWrapper } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/pg-proxy';

import { ResourcesSlowQueryBusyError } from '../src/error';
import { QueryManager } from '../src/resources/query';
import { decodeResourcesCursor } from '@animegarden/shared';
import { BANGUMI_BANNED_FANSUBS } from '../src/resources/filter';

import type { DatabaseResource } from '../src/resources/types';

const anchor = Date.parse('2026-01-02T00:00:00.000Z');

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function createResource(id: number): DatabaseResource {
  const createdAt = new Date(anchor - id * 1000);

  return {
    id,
    provider: 'dmhy',
    providerId: String(id),
    title: `resource-${id}`,
    href: `/resource/${id}`,
    type: '动画',
    magnet: `magnet:?xt=urn:btih:${String(id).padStart(40, '0')}`,
    tracker: '',
    size: id,
    createdAt,
    fetchedAt: createdAt,
    indexedAt: createdAt,
    publisherId: 1,
    fansubId: null,
    subjectId: null,
    isDeleted: false,
    duplicatedId: null,
    metadata: null
  };
}

function createManager(publisherRedis?: {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
}) {
  const logger = {
    withTag: vi.fn(() => logger),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  };

  const manager = new QueryManager(
    {
      database: {},
      publisherRedis: publisherRedis ? { status: 'ready', ...publisherRedis } : undefined,
      slowDatabase: undefined,
      slowQueryConnection: undefined,
      options: {},
      modules: {
        providers: {
          timestamp: new Date('2026-01-01T00:00:00.000Z')
        },
        users: {
          ids: new Map(),
          getByName: vi.fn(),
          getById: vi.fn()
        },
        teams: {
          ids: new Map(),
          getByName: vi.fn(),
          getById: vi.fn()
        }
      }
    } as any,
    logger as any
  ) as any;

  return { manager };
}

describe('QueryManager resolved pagination', () => {
  it.each([1000, 1001])('returns a full 1000-resource batch from %s rows', async (count) => {
    const { manager } = createManager();
    const rows = Array.from({ length: count }, (_, index) => createResource(index + 1));
    vi.spyOn(manager, 'findFromTask').mockResolvedValue(rows);
    vi.spyOn(manager, 'transform').mockImplementation(async (resource) => resource);

    const result = await manager.find({}, { limit: 1000, cursor: { anchor } });
    expect(result.resources).toHaveLength(1000);
    expect(result.resources.at(-1)).toBe(rows[999]);
    expect(result.pagination.limit).toBe(1000);
    expect(result.pagination.complete).toBe(count === 1000);
    if (count === 1000) {
      expect(result.pagination.nextCursor).toBeNull();
    } else {
      expect(decodeResourcesCursor(result.pagination.nextCursor)).toEqual({
        anchor,
        position: { createdAt: rows[999].createdAt.getTime(), id: 1000 }
      });
    }
  });

  it('returns the requested numeric anchor on an empty anchor-only batch', async () => {
    const { manager } = createManager();
    manager.system.modules.providers.timestamp = new Date(anchor);
    const oldAnchor = anchor - 1000;
    const find = vi.spyOn(manager, 'findFromTask').mockResolvedValue([]);
    const result = await manager.find(
      {},
      {
        cursor: { anchor: oldAnchor },
        limit: 30
      }
    );
    expect(find).toHaveBeenCalledWith({}, { anchor: oldAnchor });
    expect(result.pagination).toEqual({
      anchor: oldAnchor,
      limit: 30,
      nextCursor: null,
      complete: true
    });
  });

  it('keeps the original anchor after providers advance and uses id to break timestamp ties', async () => {
    const { manager } = createManager();
    manager.system.modules.providers.timestamp = new Date(anchor);
    const first = createResource(3);
    const second = { ...createResource(2), createdAt: first.createdAt };
    const last = { ...createResource(1), createdAt: first.createdAt };
    const find = vi
      .spyOn(manager, 'findFromCacheOrDatabase')
      .mockResolvedValueOnce([first, second, last])
      .mockResolvedValueOnce([last]);
    vi.spyOn(manager, 'transform').mockImplementation(async (resource) => resource);

    const batch = await manager.find({}, { limit: 2 });
    manager.system.modules.providers.timestamp = new Date(anchor + 1000);
    const next = await manager.find(
      {},
      {
        cursor: decodeResourcesCursor(batch.pagination.nextCursor),
        limit: 2
      }
    );

    expect(find).toHaveBeenLastCalledWith(
      {},
      { anchor, position: { createdAt: second.createdAt.getTime(), id: 2 } }
    );
    expect(next.resources).toEqual([last]);
    expect(next.pagination).toEqual({
      anchor,
      limit: 2,
      nextCursor: null,
      complete: true
    });
  });

  it('reuses one maximum batch across request limits and builds each cursor from its sliced tail', async () => {
    const { manager } = createManager();
    manager.system.modules.providers.timestamp = new Date(anchor);
    const resources = [createResource(1), createResource(2), createResource(3)];
    const findFromCacheOrDatabase = vi
      .spyOn(manager as any, 'findFromCacheOrDatabase')
      .mockResolvedValue(resources);
    vi.spyOn(manager, 'transform').mockImplementation(async (resource) => resource);

    const resp = await manager.find({}, { limit: 2 });
    const smallerResp = await manager.find({}, { limit: 1 });

    expect(findFromCacheOrDatabase).toHaveBeenCalledWith({}, { anchor });
    expect(findFromCacheOrDatabase).toHaveBeenCalledTimes(1);
    expect(resp.resources).toEqual(resources.slice(0, 2));
    expect(resp.pagination.complete).toBe(false);
    expect(decodeResourcesCursor(resp.pagination.nextCursor!)).toEqual({
      anchor,
      position: { createdAt: resources[1].createdAt.getTime(), id: resources[1].id }
    });
    expect(smallerResp.resources).toEqual(resources.slice(0, 1));
    expect(decodeResourcesCursor(smallerResp.pagination.nextCursor!)).toEqual({
      anchor,
      position: { createdAt: resources[0].createdAt.getTime(), id: resources[0].id }
    });
  });
});

describe('resource response transform', () => {
  it('converts the database KiB size to bytes', async () => {
    const { manager } = createManager();
    (manager.system as any).modules.users = {
      getById: vi.fn().mockResolvedValue({ id: 1, name: 'publisher' })
    };
    (manager.system as any).modules.teams = {
      getById: vi.fn()
    };

    const resource = await manager.transform(createResource(1536));

    expect(resource.size).toBe(1572864);
  });
});

describe('exact resource query Task', () => {
  it('retains one exact batch without prefetching another cursor', async () => {
    const { manager } = createManager();
    const expected = [createResource(1)];
    const findFromCacheOrDatabase = vi
      .spyOn(manager, 'findFromCacheOrDatabase')
      .mockResolvedValue(expected);

    const [resp1, resp2] = await Promise.all([
      manager.findFromTask({}, { anchor }),
      manager.findFromTask({}, { anchor })
    ]);

    expect(resp1).toEqual(expected);
    expect(resp2).toEqual(expected);
    expect(findFromCacheOrDatabase).toHaveBeenCalledTimes(1);
    expect(findFromCacheOrDatabase).toHaveBeenCalledWith({}, { anchor });
  });

  it('invalidates retained tasks when resource notifications arrive', async () => {
    const { manager } = createManager();
    const findFromCacheOrDatabase = vi
      .spyOn(manager, 'findFromCacheOrDatabase')
      .mockResolvedValue([createResource(1)]);

    await manager.findFromTask({}, { anchor });
    manager.onNotifications({
      resources: { inserted: [], updated: [], deleted: [] },
      duplicated: { attached: [], detached: [] }
    });
    await manager.findFromTask({}, { anchor });

    expect(findFromCacheOrDatabase).toHaveBeenCalledTimes(2);
  });

  it('does not reuse a retained task after the provider timestamp advances', async () => {
    const { manager } = createManager();
    const findFromCacheOrDatabase = vi
      .spyOn(manager, 'findFromCacheOrDatabase')
      .mockResolvedValue([createResource(1)]);

    await manager.findFromTask({}, { anchor });
    manager.system.modules.providers.timestamp = new Date(
      manager.system.modules.providers.timestamp.getTime() + 1000
    );
    await manager.findFromTask({}, { anchor });

    expect(findFromCacheOrDatabase).toHaveBeenCalledTimes(2);
  });

  it('evicts the least recently used Task at the configured capacity', async () => {
    const { manager } = createManager();
    vi.spyOn(manager, 'findFromCacheOrDatabase').mockResolvedValue([]);

    for (let subject = 0; subject < 100; subject++) {
      await manager.findFromTask({ subjects: [subject] }, { anchor });
    }
    await manager.findFromTask({ subjects: [0] }, { anchor });
    await manager.findFromTask({ subjects: [100] }, { anchor });

    const tasks = manager.tasks as Map<string, unknown>;
    expect(tasks.size).toBe(100);
    const providerTimestamp = manager.system.modules.providers.timestamp.getTime();
    expect(
      tasks.has(hash({ filter: { subjects: [0] }, cursor: { anchor }, providerTimestamp }))
    ).toBe(true);
    expect(
      tasks.has(hash({ filter: { subjects: [1] }, cursor: { anchor }, providerTimestamp }))
    ).toBe(false);
  });
});

describe('resources Redis and database query', () => {
  it('writes to the same captured Redis generation when providers refresh during the database query', async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK')
    };
    const { manager } = createManager(redis);
    vi.spyOn(manager, 'findFromDatabase').mockImplementation(async () => {
      manager.system.modules.providers.timestamp = new Date(anchor + 1000);
      return [];
    });

    await manager.findFromCacheOrDatabase({}, { anchor });
    expect(redis.set).toHaveBeenCalledWith(redis.get.mock.calls[0][0], '[]', 'EX', 300);
    await manager.findFromCacheOrDatabase({}, { anchor });
    expect(redis.get.mock.calls[1][0]).not.toBe(redis.get.mock.calls[0][0]);
  });

  it('treats malformed Redis payloads as misses and keeps cache failures out of the query layer', async () => {
    const redis = {
      get: vi.fn().mockResolvedValue('not-json'),
      set: vi.fn()
    };
    const { manager } = createManager(redis);
    vi.spyOn(manager, 'findFromDatabase').mockResolvedValue([createResource(1)]);
    await expect(manager.findFromCacheOrDatabase({}, { anchor })).resolves.toEqual([
      createResource(1)
    ]);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('generates indexed visibility, tuple continuation and bounded stable ordering without OFFSET', async () => {
    const { manager } = createManager();
    const execute = vi.fn(async () => ({ rows: [] }));
    const database = drizzle(execute);
    const createdAt = new Date('2026-01-01T12:00:00.000Z');

    await manager.findFromDatabase(
      { subjects: [42] },
      { anchor, position: { createdAt: createdAt.getTime(), id: 7 } },
      { database }
    );

    expect(execute).toHaveBeenCalledOnce();
    const [statement, params] = execute.mock.calls[0] as unknown as [string, unknown[]];
    expect(statement).toContain('"resources"."indexed_at" <=');
    expect(statement).toContain('("resources"."created_at", "resources"."id") <');
    expect(statement).toContain('order by "resources"."created_at" desc, "resources"."id" desc');
    expect(statement.toLowerCase()).not.toContain('offset');
    expect(params).toEqual([
      false,
      new Date(anchor).toISOString(),
      createdAt.toISOString(),
      7,
      42,
      1001
    ]);
  });

  it('bounds a stalled Redis read, bypasses during cooldown and resumes afterwards', async () => {
    vi.useFakeTimers();
    const redis = {
      get: vi
        .fn()
        .mockImplementationOnce(() => new Promise(() => {}))
        .mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK')
    };
    const { manager } = createManager(redis);
    vi.spyOn(manager, 'findFromDatabase').mockResolvedValue([]);

    const result = manager.findFromCacheOrDatabase({}, { anchor });
    await vi.advanceTimersByTimeAsync(500);
    await expect(result).resolves.toEqual([]);
    await manager.findFromCacheOrDatabase({}, { anchor });
    expect(redis.get).toHaveBeenCalledTimes(1);
    expect(redis.set).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(30_000);
    await manager.findFromCacheOrDatabase({}, { anchor });
    expect(redis.get).toHaveBeenCalledTimes(2);
    expect(redis.set).toHaveBeenCalledOnce();
  });

  it('returns database data without waiting for a stalled cache write and handles late rejection', async () => {
    vi.useFakeTimers();
    let rejectWrite!: (error: Error) => void;
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(
        () =>
          new Promise((_resolve, reject) => {
            rejectWrite = reject;
          })
      )
    };
    const { manager } = createManager(redis);
    vi.spyOn(manager, 'findFromDatabase').mockResolvedValue([createResource(1)]);

    await expect(manager.findFromCacheOrDatabase({}, { anchor })).resolves.toEqual([
      createResource(1)
    ]);
    await vi.advanceTimersByTimeAsync(500);
    rejectWrite(new Error('late failure'));
    await vi.advanceTimersByTimeAsync(0);
    await manager.findFromCacheOrDatabase({}, { anchor });
    expect(redis.get).toHaveBeenCalledOnce();
  });

  it('encodes the cursor position with the timestamp and id column encoders', async () => {
    const { manager } = createManager();
    const createdAt = new Date('2026-01-01T12:00:00.000Z');
    const executeResourcesQuery = vi
      .spyOn(manager as any, 'executeResourcesQuery')
      .mockResolvedValue([]);

    await manager.findFromDatabase(
      {},
      { anchor, position: { createdAt: createdAt.getTime(), id: 42 } }
    );

    const conds = executeResourcesQuery.mock.calls[0][1] as SQLWrapper[];
    const cursorCondition = conds[2];
    const query = new PgDialect().sqlToQuery(cursorCondition.getSQL());
    expect(query.params).toEqual([createdAt.toISOString(), 42]);
  });

  it('keeps resources without a fansub in the bangumi preset', async () => {
    const { manager } = createManager();
    manager.system.modules.teams.getByName.mockReturnValue({ id: 7 });
    const executeResourcesQuery = vi
      .spyOn(manager as any, 'executeResourcesQuery')
      .mockResolvedValue([]);

    await manager.findFromDatabase({ preset: 'bangumi' }, { anchor });

    const conds = executeResourcesQuery.mock.calls[0][1] as SQLWrapper[];
    const dialect = new PgDialect();
    const fansubCondition = conds
      .map((condition) => dialect.sqlToQuery(condition.getSQL()))
      .find((condition) => condition.sql.includes('"fansub_id"'))!;
    expect(fansubCondition.sql).toMatch(/"fansub_id" is null or .*"fansub_id" not in/);
    expect(fansubCondition.params).toEqual(BANGUMI_BANNED_FANSUBS.map(() => 7));
  });

  it('returns an exact Redis cache hit without querying PostgreSQL', async () => {
    const cached = createResource(1);
    const publisherRedis = {
      get: vi.fn().mockResolvedValue(JSON.stringify([cached])),
      set: vi.fn()
    };
    const { manager } = createManager(publisherRedis);
    const findFromDatabase = vi.spyOn(manager, 'findFromDatabase');

    const resp = await (manager as any).findFromCacheOrDatabase({}, { anchor });

    expect(resp).toEqual([cached]);
    expect(resp[0].indexedAt).toBeInstanceOf(Date);
    expect(findFromDatabase).not.toHaveBeenCalled();
    expect(publisherRedis.set).not.toHaveBeenCalled();
  });

  it('writes PostgreSQL results to the exact Redis cache with the configured TTL', async () => {
    const publisherRedis = {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue('OK')
    };
    const { manager } = createManager(publisherRedis);
    const expected = [createResource(1)];
    vi.spyOn(manager, 'findFromDatabase').mockResolvedValue(expected);

    await (manager as any).findFromCacheOrDatabase({}, { anchor });

    expect(publisherRedis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^animegarden:resources:query:/),
      JSON.stringify(expected),
      'EX',
      300
    );
  });
});

describe('resources slow query fallback', () => {
  it('falls back to the extended-timeout lane after a statement timeout', async () => {
    const { manager } = createManager();
    const expected = [createResource(1)];

    const executeResourcesQuery = vi
      .spyOn(manager as any, 'executeResourcesQuery')
      .mockRejectedValueOnce(new Error('canceling statement due to statement timeout'))
      .mockResolvedValueOnce(expected);

    const slowQueryConnection = {
      unsafe: vi
        .fn()
        .mockResolvedValueOnce([{ locked: true }])
        .mockResolvedValueOnce([{ pg_advisory_unlock: true }])
    };

    (manager.system as any).slowDatabase = {};
    (manager.system as any).slowQueryConnection = slowQueryConnection;

    const resp = await manager.findFromDatabase(
      {},
      { anchor },
      {
        allowSlowQueryFallback: true
      }
    );

    expect(resp).toEqual(expected);
    expect(executeResourcesQuery).toHaveBeenCalledTimes(2);
    expect(executeResourcesQuery).toHaveBeenNthCalledWith(
      2,
      (manager.system as any).slowDatabase,
      expect.any(Array),
      1001,
      '{}',
      'slow database'
    );
    expect(slowQueryConnection.unsafe).toHaveBeenCalledTimes(2);
  });

  it('rejects immediately when the slow lane is already busy', async () => {
    const { manager } = createManager();

    (manager.system as any).slowDatabase = {};
    (manager.system as any).slowQueryConnection = {
      unsafe: vi.fn()
    };
    (manager as any).slowQuerying = true;

    await expect((manager as any).findFromSlowDatabase([], 10, '{}')).rejects.toBeInstanceOf(
      ResourcesSlowQueryBusyError
    );
  });
});
