import type { ConsolaInstance } from 'consola';

import { hash } from 'ohash';
import { memoAsync } from 'memofunc';
import {
  type SQLWrapper,
  and,
  desc,
  eq,
  gte,
  ilike,
  notIlike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql
} from 'drizzle-orm';

import {
  type ProviderType,
  type ResolvedFilterOptions,
  normalizeTitle,
  transformResourceHref
} from '@animegarden/client';

import type { System, NotifiedResources } from '../system';

import { resources } from '../schema/resources';
import { jieba, nextTick, retryFn } from '../utils';

import type { DatabaseResource } from './types';

import { transformDatabaseUser } from './transform';

type DatabaseFilterOptions = Omit<
  Partial<ResolvedFilterOptions>,
  'page' | 'pageSize' | 'publishers' | 'fansubs'
> & {
  publishers?: number[];
  fansubs?: number[];
};

/**
 * 最大同时存活缓存个数
 */
const MAX_TASK = 1000;

/**
 * 单个缓存预取数量
 */
const TASK_PREFETCH_COUNT = 1000;

export const RESOURCE_SELECTOR = {
  id: resources.id,
  provider: resources.provider,
  providerId: resources.providerId,
  title: resources.title,
  href: resources.href,
  type: resources.type,
  magnet: resources.magnet,
  tracker: resources.tracker,
  size: resources.size,
  createdAt: resources.createdAt,
  fetchedAt: resources.fetchedAt,
  publisherId: resources.publisherId,
  fansubId: resources.fansubId,
  subjectId: resources.subjectId,
  duplicatedId: resources.duplicatedId,
  metadata: resources.metadata
};

export class QueryManager {
  private readonly system: System;

  private readonly logger: ConsolaInstance;

  private readonly tasks: Map<string, Task> = new Map();

  private readonly downgrade: Set<string> = new Set();

  public constructor(system: System) {
    this.system = system;
    this.logger = system.logger.withTag('query');
  }

  public async initialize() {
    if (!this.system.options.cron) {
      this.find({
        page: 1,
        pageSize: 100,
        types: ['动画']
      });
    }

    // LRU 垃圾回收, 每小时 1 次
    let ev: NodeJS.Timeout;
    const TIMEOUT = 60 * 60 * 1000;
    const handler = async () => {
      try {
        await this.clearDeadTasks();
        ev = setTimeout(handler, TIMEOUT);
      } catch (error) {
        this.logger.error(error);
      }
    };
    ev = setTimeout(handler, TIMEOUT);
    this.system.disposables.push(() => clearTimeout(ev));
  }

  public async find(filter: ResolvedFilterOptions) {
    const dbOptions = this.normalizeDatabaseFilterOptions(filter);
    const { resources, hasMore } = await this.findFromTask(dbOptions, filter.page, filter.pageSize);

    const { users, teams } = this.system.modules;

    return {
      resources: await Promise.all(resources.map(async (r) => this.transform(r))),
      complete: !hasMore,
      filter: {
        page: filter.page,
        pageSize: filter.pageSize,
        ...dbOptions,
        publishers: dbOptions.publishers?.map((p) => users.ids.get(p)?.name!),
        fansubs: dbOptions.fansubs?.map((p) => teams.ids.get(p)?.name!),
        before: dbOptions.before?.toISOString(),
        after: dbOptions.after?.toISOString(),
        subjects: dbOptions.subjects
      }
    };
  }

  public async transform(r: DatabaseResource) {
    const { users, teams } = this.system.modules;

    return {
      id: r.id,
      provider: r.provider,
      providerId: r.providerId,
      title: r.title,
      href: transformResourceHref(r.provider as ProviderType, r.href),
      type: r.type,
      magnet: r.magnet,
      tracker: r.tracker,
      size: r.size,
      createdAt: r.createdAt.toISOString(),
      fetchedAt: r.fetchedAt.toISOString(),
      publisher: transformDatabaseUser(await users.getById(r.publisherId)),
      fansub: r.fansubId ? transformDatabaseUser(await teams.getById(r.fansubId)) : undefined,
      subjectId: r.subjectId,
      metadata: r.metadata
    };
  }

  public async findFromTask(dbOptions: DatabaseFilterOptions, page: number, pageSize: number) {
    const fullKey = `${hash(dbOptions)}:${page}:${pageSize}`;

    if (!this.downgrade.has(fullKey)) {
      const { search, include, keywords, fansubs, publishers, types, subjects } = dbOptions;

      let task: Task;
      if (search && search.length > 0) {
        // 1. 搜索
        task = this.getTask({ search, exclude: dbOptions.exclude });
      } else if ((include && include.length > 0) || (keywords && keywords.length > 0)) {
        // 2. 标题匹配
        task = this.getTask({ include, keywords, exclude: dbOptions.exclude });
      } else if ((fansubs && fansubs.length > 0) || (publishers && publishers.length > 0)) {
        // 3. 字幕组匹配
        task = this.getTask({ fansubs, publishers });
      } else if (types && types.length > 0) {
        // 4. 类型
        task = this.getTask({ types });
      } else if (subjects && subjects.length > 0) {
        // 5. subject
        task = this.getTask({ subjects });
      } else {
        // 6. 回退到直接缓存数据库
        task = this.getTask(dbOptions);
      }

      if (task) {
        // 预取缓存
        await task.prefetch();

        // 最多再预取 1 次
        for (let i = 0; i < 2; i++) {
          if (i > 0) {
            await task.prefetchNextPage();
          }

          const cache = await task.fetch(dbOptions, page, pageSize);
          if (cache.ok) {
            return {
              resources: cache.resources,
              hasMore: cache.hasMore
            };
          }
          if (!task.hasMore) {
            break;
          }
        }
      }
    }

    // 回退到直接查数据库
    this.downgrade.add(fullKey);
    const resp = await this.findFromRedis(dbOptions, (page - 1) * pageSize, pageSize + 1);

    return {
      resources: resp.slice(0, pageSize),
      hasMore: resp.length > pageSize
    };
  }

  private getTask(options: DatabaseFilterOptions) {
    const key = hash(options);
    if (!this.tasks.has(key)) {
      const task = new Task(this, key, options);
      this.tasks.set(key, task);
    }
    const task = this.tasks.get(key)!.visit();
    return task;
  }

  private async clearDeadTasks() {
    const tasks = [...this.tasks.values()];

    // 1. 重试过期的缓存
    const now = new Date();
    for (const task of tasks) {
      const delta = now.getTime() - task.fetchedAt.getTime();
      if (delta > 2 * 60 * 60 * 1000) {
        task.clear();
      }
    }

    // 2. 清理多余的缓存
    if (tasks.length > MAX_TASK) {
      tasks.sort((lhs, rhs) => {
        if (lhs.visited.count !== rhs.visited.count) {
          return rhs.visited.count - lhs.visited.count;
        } else {
          return rhs.visited.last.getTime() - lhs.visited.last.getTime();
        }
      });
      for (let i = MAX_TASK; i < tasks.length; i++) {
        const task = tasks[i];
        if (this.tasks.has(task.key)) {
          this.tasks.delete(task.key);
          task.clear();
        }
      }
    }
  }

  private normalizeDatabaseFilterOptions(filter: ResolvedFilterOptions): DatabaseFilterOptions {
    const { users, teams } = this.system.modules;

    return {
      provider: filter.provider,
      duplicate: filter.duplicate,
      publishers: filter.publishers
        ?.map((p) => users.getByName(p)?.id)
        .filter((p) => p !== undefined),
      fansubs: filter.fansubs?.map((p) => teams.getByName(p)?.id).filter((p) => p !== undefined),
      types: filter.types,
      before: filter.before,
      after: filter.after,
      subjects: filter.subjects,
      search: filter.search?.map((t) => normalizeTitle(t)),
      include: filter.include?.map((t) => normalizeTitle(t)),
      keywords: filter.keywords?.map((t) => normalizeTitle(t)),
      exclude: filter.exclude?.map((t) => normalizeTitle(t))
    };
  }

  public findFromRedis = memoAsync(
    async (filter: DatabaseFilterOptions, offset: number, limit: number) => {
      // TODO: read redis here
      const resp = await this.findFromDatabase(filter, offset, limit);
      return resp;
    },
    {
      serialize: (filter, offset, limit) => {
        return [hash(filter), offset, limit];
      }
    }
  );

  public async findFromDatabase(filter: DatabaseFilterOptions, offset: number, limit: number) {
    const now = performance.now();
    const payload = JSON.stringify(filter);
    this.logger.info(
      `Start executing resources query on database: ${payload} (offset: ${offset}, limit: ${limit})`
    );

    const {
      provider,
      duplicate,
      fansubs,
      publishers,
      types,
      before,
      after,
      search,
      include,
      keywords,
      exclude
    } = filter;

    const conds: SQLWrapper[] = [eq(resources.isDeleted, false)];

    if (provider) {
      conds.push(eq(resources.provider, provider));
    }

    if (duplicate) {
      conds.push(isNotNull(resources.duplicatedId));
    } else {
      conds.push(isNull(resources.duplicatedId));
    }

    if (fansubs && fansubs.length > 0) {
      if (fansubs.length === 1) {
        conds.push(eq(resources.fansubId, fansubs[0]));
      } else {
        conds.push(inArray(resources.fansubId, fansubs));
      }
    }

    if (publishers && publishers.length > 0) {
      if (publishers.length === 1) {
        conds.push(eq(resources.publisherId, publishers[0]));
      } else {
        conds.push(inArray(resources.publisherId, publishers));
      }
    }

    if (types && types.length > 0) {
      if (types.length === 1) {
        conds.push(eq(resources.type, types[0]));
      } else {
        conds.push(inArray(resources.type, types));
      }
    }

    if (before) {
      conds.push(lte(resources.createdAt, before));
    }

    if (after) {
      conds.push(gte(resources.createdAt, after));
    }

    if (search && search.length > 0) {
      const cutted = search.map((t) =>
        jieba
          .cut(t, false)
          .map((t) => t.trim())
          .filter(Boolean)
      );
      const tsquery = cutted.flat().join(' & ');
      conds.push(sql`(${resources.titleSearch} @@ to_tsquery(${tsquery}))`);
    } else if ((include && include.length > 0) || (keywords && keywords.length > 0)) {
      if (include) {
        if (include.length === 1) {
          conds.push(ilike(resources.titleAlt, `%${include[0]}%`));
        } else {
          const ic = or(...include.map((i) => ilike(resources.titleAlt, `%${i}%`)));
          ic && conds.push(ic);
        }
      }
      if (keywords) {
        conds.push(...keywords.map((i) => ilike(resources.titleAlt, `%${i}%`)));
      }
      if (exclude) {
        conds.push(...exclude.map((i) => notIlike(resources.titleAlt, `%${i}%`)));
      }
    }

    const resp = await retryFn(
      () =>
        this.system.database
          .select(RESOURCE_SELECTOR)
          .from(resources)
          .where(and(...conds))
          .orderBy(desc(resources.createdAt))
          .offset(offset)
          .limit(limit),
      5
    );

    const end = performance.now();
    this.logger.info(
      `Finish selecting ${resp.length} resources in ${Math.floor(end - now)} ms from database: ${payload} (offset: ${offset}, limit: ${limit})`
    );

    return resp;
  }

  public async onNotifications(notified: NotifiedResources[]) {
    await this.findFromRedis.clear();

    const resp = await retryFn(
      () =>
        this.system.database
          .select(RESOURCE_SELECTOR)
          .from(resources)
          .where(
            and(
              eq(resources.isDeleted, false),
              inArray(
                resources.id,
                notified.map((r) => r.id)
              )
            )
          )
          .orderBy(desc(resources.createdAt)),
      5
    );

    this.logger.info(`Notified ${resp.length} new resources`);

    const tasks = [...this.tasks.values()];
    for (const task of tasks) {
      if (!task.ok) continue;
      if (!this.tasks.has(task.key)) continue;
      if (task.options.search) {
        task.clear();
      } else {
        // Insert resources
        task.insertResources(resp);
      }
      await nextTick();
    }
  }
}

export class Task {
  private readonly query: QueryManager;

  public readonly key: string;

  public readonly options: DatabaseFilterOptions;

  public readonly conds: Array<(r: DatabaseResource) => boolean> = [];

  public readonly visited = { count: 0, last: new Date() };

  public fetchedAt: Date = new Date();

  public prefetchCount = 0;

  public ok = false;

  public resources: DatabaseResource[] = [];

  public hasMore = false;

  public constructor(query: QueryManager, key: string, options: DatabaseFilterOptions) {
    this.query = query;
    this.key = key;
    this.options = options;

    const conds = this.conds;
    const {
      provider,
      duplicate,
      publishers,
      fansubs,
      types,
      subjects,
      before,
      after,
      include,
      keywords,
      exclude
    } = options;
    if (provider) {
      conds.push((r) => r.provider === provider);
    }
    if (include || keywords) {
      conds.push((r) => {
        const title = normalizeTitle(r.title);
        return (
          (include?.some((i) => title.indexOf(i) !== -1) ?? true) &&
          (keywords?.every((i) => title.indexOf(i) !== -1) ?? true) &&
          (exclude?.every((i) => title.indexOf(i) === -1) ?? true)
        );
      });
    }
    if (duplicate) {
      conds.push((r) => r.duplicatedId !== null && r.duplicatedId !== undefined);
    }
    if (publishers && publishers.length > 0) {
      conds.push((r) => publishers.some((p) => r.publisherId === p));
    }
    if (fansubs && fansubs.length > 0) {
      conds.push((r) => fansubs.some((p) => r.fansubId === p));
    }
    if (types && types.length > 0) {
      conds.push((r) => types.some((t) => r.type === t));
    }
    if (subjects && subjects.length > 0) {
      conds.push((r) => subjects.some((s) => r.subjectId === s));
    }
    if (before) {
      const t = before.getTime();
      conds.push((r) => r.createdAt.getTime() <= t);
    }
    if (after) {
      const t = after.getTime();
      conds.push((r) => r.createdAt.getTime() >= t);
    }
  }

  public visit() {
    this.visited.count += 1;
    this.visited.last = new Date();
    return this;
  }

  public clear() {
    this.prefetch.clear();
    this.prefetchNextPage.clear();
    this.prefetchCount = 0;
    this.ok = false;
    this.resources = [];
    this.hasMore = false;
    return this;
  }

  public prefetch = memoAsync(async () => {
    const count = this.prefetchCount;
    const resp = await this.query.findFromDatabase(this.options, count, TASK_PREFETCH_COUNT + 1);
    this.resources = resp;
    this.prefetchCount += resp.length;
    this.hasMore = resp.length > TASK_PREFETCH_COUNT;
    this.fetchedAt = new Date();
    this.ok = true;
    return resp;
  });

  public prefetchNextPage = memoAsync(async () => {
    const prevCount = this.prefetchCount;
    const resp = await this.query.findFromDatabase(this.options, prevCount, TASK_PREFETCH_COUNT);
    this.resources.push(...resp);
    this.prefetchCount += resp.length;
    this.hasMore = resp.length > TASK_PREFETCH_COUNT;
    this.fetchedAt = new Date();
    this.ok = true;
    this.prefetchNextPage.clear();
    return resp;
  });

  public async fetch(options: DatabaseFilterOptions, page: number, pageSize: number) {
    const { provider, duplicate, publishers, fansubs, types, subjects, before, after } = options;
    const conds: Array<(r: DatabaseResource) => boolean> = [];

    if (provider) {
      conds.push((r) => r.provider === provider);
    }
    if (duplicate) {
      conds.push((r) => r.duplicatedId !== null && r.duplicatedId !== undefined);
    }
    if (publishers && publishers.length > 0) {
      conds.push((r) => publishers.some((p) => r.publisherId === p));
    }
    if (fansubs && fansubs.length > 0) {
      conds.push((r) => fansubs.some((p) => r.fansubId === p));
    }
    if (types && types.length > 0) {
      conds.push((r) => types.some((t) => r.type === t));
    }
    if (subjects && subjects.length > 0) {
      conds.push((r) => subjects.some((s) => r.subjectId === s));
    }
    if (before) {
      const t = before.getTime();
      conds.push((r) => r.createdAt.getTime() <= t);
    }
    if (after) {
      const t = after.getTime();
      conds.push((r) => r.createdAt.getTime() >= t);
    }

    let cursor = 0;
    let matched = 0;
    const slice: DatabaseResource[] = [];
    for (; cursor < this.resources.length; cursor++) {
      const res = this.resources[cursor];
      const ok = conds.every((c) => c(res));
      if (ok) {
        if ((page - 1) * pageSize <= matched) {
          slice.push(res);
        }
        matched++;
        if (matched >= page * pageSize) {
          break;
        }
      }
    }

    return {
      ok: true,
      resources: slice,
      hasMore: matched >= page * pageSize || cursor < this.resources.length || this.hasMore
    };
  }

  public insertResources(resp: DatabaseResource[]) {
    const visited = new Set(this.resources.map((r) => r.id));
    let changed = false;
    for (const r of resp) {
      if (!visited.has(r.id) && this.conds.every((c) => c(r))) {
        changed = true;
        visited.add(r.id);
        this.resources.push(r);
      }
    }
    if (changed) {
      this.prefetchCount = this.resources.length;
      this.resources.sort((lhs, rhs) => rhs.createdAt.getTime() - lhs.createdAt.getTime());
    }
  }
}
