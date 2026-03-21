import { describe, expect, it, vi } from 'vitest';
import { hash } from 'ohash';

import { RESOURCES_TASK_PREFETCH_MAX_COUNT } from '../src/constants';
import { ResourcesSlowQueryBusyError } from '../src/error';
import { QueryManager, Task } from '../src/resources/query';

import type { DatabaseFilterOptions, DatabaseResource } from '../src/resources/types';

function createResource(id: number): DatabaseResource {
  const createdAt = new Date(`2026-01-01T00:00:${String(id % 60).padStart(2, '0')}.000Z`);

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
    publisherId: 1,
    fansubId: null,
    subjectId: null,
    isDeleted: false,
    duplicatedId: null,
    metadata: null
  };
}

function createTask(total: number, options: DatabaseFilterOptions = {}) {
  const findFromRedis = vi.fn(
    async (_filter: DatabaseFilterOptions, offset: number, limit: number) => {
      const count = Math.max(0, Math.min(limit, total - offset));
      return Array.from({ length: count }, (_, index) => createResource(offset + index + 1));
    }
  );

  const query = {
    system: {
      modules: {}
    },
    findFromRedis
  } as any;

  return {
    task: new Task(query, 'task', options),
    findFromRedis
  };
}

function createManager() {
  const logger = {
    withTag: vi.fn(() => logger),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  };

  const manager = new QueryManager(
    {
      database: {},
      slowDatabase: undefined,
      slowQueryConnection: undefined,
      options: {},
      modules: {
        providers: {
          timestamp: new Date('2026-01-01T00:00:00.000Z')
        }
      }
    } as any,
    logger as any
  ) as any;

  manager.findFromRedis = vi.fn(async () => []);

  return {
    manager,
    findFromRedis: manager.findFromRedis
  };
}

describe('Task prefetch', () => {
  it('checks the current cache before expanding an already warm task', async () => {
    const dbOptions: DatabaseFilterOptions = { search: ['test'] };
    const taskOptions: DatabaseFilterOptions = {
      search: dbOptions.search,
      exclude: dbOptions.exclude
    };
    const { manager, findFromRedis } = createManager();
    const task = new Task(manager, hash(taskOptions), taskOptions);

    task.ok = true;
    task.hasMore = true;
    task.resources = Array.from({ length: 60 }, (_, index) => createResource(index + 1));
    task.prefetchCount = task.resources.length;

    (manager.tasks as Map<string, Task>).set(task.key, task);

    const resp = await manager.findFromTask(dbOptions, 1, 30);

    expect(findFromRedis).not.toHaveBeenCalled();
    expect(resp.resources).toHaveLength(30);
    expect(resp.hasMore).toBe(true);
    expect(task.prefetchCount).toBe(60);
  });

  it('reuses prefetched resources for concurrent and subsequent requests', async () => {
    const { task, findFromRedis } = createTask(300, { search: ['test'] });

    await Promise.all([task.prefetch(0, 30), task.prefetch(0, 30)]);

    expect(findFromRedis).toHaveBeenCalledTimes(1);
    expect(task.prefetchCount).toBeGreaterThan(0);

    const prefetchedCount = task.prefetchCount;
    await task.prefetch(0, 30);

    expect(findFromRedis).toHaveBeenCalledTimes(1);
    expect(task.prefetchCount).toBe(prefetchedCount);

    await task.prefetch(task.prefetchCount, 30);

    expect(findFromRedis).toHaveBeenCalledTimes(2);
    expect(task.prefetchCount).toBeGreaterThan(prefetchedCount);
  });

  it('stops expanding after hitting the total prefetch cap', async () => {
    const { task, findFromRedis } = createTask(RESOURCES_TASK_PREFETCH_MAX_COUNT + 500, {
      search: ['test']
    });

    await task.prefetch(0, 1000);
    while (task.canPrefetchMore()) {
      await task.prefetch(task.prefetchCount, 1000);
    }

    expect(task.prefetchCount).toBe(RESOURCES_TASK_PREFETCH_MAX_COUNT);
    expect(task.hasMore).toBe(true);
    expect(task.canPrefetchMore()).toBe(false);

    const called = findFromRedis.mock.calls.length;
    await task.prefetch(task.prefetchCount, 1000);

    expect(findFromRedis).toHaveBeenCalledTimes(called);
  });

  it('reopens capped tasks after cached resources are removed', async () => {
    const { task, findFromRedis } = createTask(RESOURCES_TASK_PREFETCH_MAX_COUNT + 500, {
      search: ['test']
    });

    await task.prefetch(0, 1000);
    while (task.canPrefetchMore()) {
      await task.prefetch(task.prefetchCount, 1000);
    }

    const removed = new Set(task.resources.slice(-5).map((resource) => resource.id));
    const calls = findFromRedis.mock.calls.length;

    task.removeResources(removed);

    expect(task.prefetchCount).toBe(RESOURCES_TASK_PREFETCH_MAX_COUNT - removed.size);
    expect(task.canPrefetchMore()).toBe(true);

    await task.prefetch(task.prefetchCount, 1000);

    expect(findFromRedis).toHaveBeenCalledTimes(calls + 1);
  });
});

describe('resources slow query fallback', () => {
  it('coalesces concurrent downgraded queries on the accurate path', async () => {
    const { manager } = createManager();
    const expected = [createResource(1)];

    vi.spyOn(manager as any, 'readRedisQueryCache').mockResolvedValue(undefined);
    vi.spyOn(manager as any, 'writeRedisQueryCache').mockResolvedValue(undefined);

    const findFromDatabase = vi
      .spyOn(manager, 'findFromDatabase')
      .mockImplementation(async () => expected);

    const [resp1, resp2] = await Promise.all([
      (manager as any).findFromAccurateQuery({}, 0, 10),
      (manager as any).findFromAccurateQuery({}, 0, 10)
    ]);

    expect(resp1).toEqual(expected);
    expect(resp2).toEqual(expected);
    expect(findFromDatabase).toHaveBeenCalledTimes(1);
    expect(findFromDatabase).toHaveBeenCalledWith({}, 0, 10, {
      allowSlowQueryFallback: true
    });
  });

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

    const resp = await manager.findFromDatabase({}, 0, 10, {
      allowSlowQueryFallback: true
    });

    expect(resp).toEqual(expected);
    expect(executeResourcesQuery).toHaveBeenCalledTimes(2);
    expect(executeResourcesQuery).toHaveBeenNthCalledWith(
      2,
      (manager.system as any).slowDatabase,
      expect.any(Array),
      0,
      10,
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

    await expect((manager as any).findFromSlowDatabase([], 0, 10, '{}')).rejects.toBeInstanceOf(
      ResourcesSlowQueryBusyError
    );
  });
});
