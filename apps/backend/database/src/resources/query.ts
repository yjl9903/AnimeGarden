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
  isNull,
  lte,
  or,
  sql
} from 'drizzle-orm';

import {
  type ProviderType,
  type ResolvedFilterOptions,
  ResolvedPaginationOptions,
  normalizeTitle,
  transformResourceHref
} from '@animegarden/client';

import type { System, Notification } from '../system';

import { memo } from '../system/cache';
import { resources } from '../schema/resources';
import { jieba, nextTick, removePunctuations, retryFn } from '../utils';
import { MAX_RESOURCES_TASK_COUNT, RESOURCES_TASK_PREFETCH_COUNT } from '../constants';

import type { DatabaseResource } from './types';

import { transformDatabaseUser } from './transform';
import { TitlePool, MagnetPool, TrackerPool } from './pool';

type DatabaseFilterOptions = Omit<
  Partial<ResolvedFilterOptions>,
  'page' | 'pageSize' | 'publishers' | 'fansubs'
> & {
  publishers?: number[];
  fansubs?: number[];
};

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
  isDeleted: resources.isDeleted,
  duplicatedId: resources.duplicatedId,
  metadata: resources.metadata
};

export class QueryManager {
  private readonly system: System;

  private readonly logger: ConsolaInstance;

  private readonly tasks: Map<string, Task> = new Map();

  private readonly downgrade: Set<string> = new Set();

  private readonly resources: Map<ProviderType, Map<string, DatabaseResource>> = new Map();

  public constructor(system: System, logger: ConsolaInstance) {
    this.system = system;
    this.logger = logger.withTag('query');
  }

  public async initialize() {
    if (!this.system.options.cron) {
      this.find(
        {
          preset: 'bangumi',
          types: ['动画']
        },
        { page: 1, pageSize: 100 }
      );
    }

    // LRU 垃圾回收, 每小时 1 次
    {
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

    // 垃圾回收
    {
      this.findFromRedis.startGC();
      this.system.disposables.push(() => {
        this.findFromRedis.stopGC();
      });
    }

    // 清空字符串常量池
    {
      let ev: NodeJS.Timeout;
      const TIMEOUT = 24 * 60 * 60 * 1000;
      const handler = async () => {
        try {
          TitlePool.clear();
          MagnetPool.clear();
          TrackerPool.clear();
          ev = setTimeout(handler, TIMEOUT);
        } catch (error) {
          this.logger.error(error);
        }
      };
      ev = setTimeout(handler, TIMEOUT);
      this.system.disposables.push(() => clearTimeout(ev));
    }
  }

  public async find(filter: ResolvedFilterOptions, pagination: ResolvedPaginationOptions) {
    const dbOptions = this.normalizeDatabaseFilterOptions(filter);
    const { resources, hasMore } = await this.findFromTask(
      dbOptions,
      pagination.page,
      pagination.pageSize
    );

    const { users, teams } = this.system.modules;

    return {
      resources: await Promise.all(resources.map(async (r) => this.transform(r))),
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        complete: !hasMore
      },
      filter: {
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
      title: TitlePool.get(r.title),
      href: transformResourceHref(r.provider as ProviderType, r.href) ?? '',
      type: r.type,
      magnet: MagnetPool.get(r.magnet),
      tracker: TrackerPool.get(r.tracker),
      size: r.size,
      createdAt: r.createdAt.toISOString(),
      fetchedAt: r.fetchedAt.toISOString(),
      publisher: transformDatabaseUser(await users.getById(r.publisherId))!,
      fansub: r.fansubId ? transformDatabaseUser(await teams.getById(r.fansubId)) : undefined,
      subjectId: r.subjectId ?? undefined,
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
      } else if (include && include.length > 0) {
        // 2. 标题匹配
        task = this.getTask({ include, keywords, exclude: dbOptions.exclude });
      } else if (subjects && subjects.length > 0) {
        // 3. subject
        task = this.getTask({ subjects });
      } else if (types && types.length > 0) {
        // 4. 类型
        task = this.getTask({ types });
      } else if ((fansubs && fansubs.length > 0) || (publishers && publishers.length > 0)) {
        // 5. 字幕组匹配
        task = this.getTask({ fansubs, publishers });
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
    if (tasks.length > MAX_RESOURCES_TASK_COUNT) {
      tasks.sort((lhs, rhs) => {
        if (lhs.visited.count !== rhs.visited.count) {
          return rhs.visited.count - lhs.visited.count;
        } else {
          return rhs.visited.last.getTime() - lhs.visited.last.getTime();
        }
      });
      for (let i = MAX_RESOURCES_TASK_COUNT; i < tasks.length; i++) {
        const task = tasks[i];
        if (this.tasks.has(task.key)) {
          this.tasks.delete(task.key);
          for (const r of task.resources) {
            // 清除 intern resource object 缓存
            this.resources.get(r.provider as ProviderType)?.delete(r.providerId);
          }
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
      search:
        filter.search && filter.search.length > 0
          ? filter.search
              ?.map((t) => removePunctuations(t.trim()))
              ?.filter(Boolean)
              ?.map((t) => normalizeTitle(t).toLowerCase())
          : undefined,
      include:
        filter.include && filter.include.length > 0
          ? filter.include
              ?.map((t) => t.trim())
              ?.filter(Boolean)
              ?.map((t) => normalizeTitle(t).toLowerCase())
          : undefined,
      keywords:
        filter.keywords && filter.keywords.length > 0
          ? filter.keywords
              ?.map((t) => t.trim())
              ?.filter(Boolean)
              ?.map((t) => normalizeTitle(t).toLowerCase())
          : filter.keywords,
      exclude:
        filter.exclude && filter.exclude.length > 0
          ? filter.exclude
              ?.map((t) => t.trim())
              ?.filter(Boolean)
              ?.map((t) => normalizeTitle(t).toLowerCase())
          : undefined
    };
  }

  public findFromRedis = memo(
    async (filter: DatabaseFilterOptions, offset: number, limit: number) => {
      // TODO: read redis here
      const resp = await this.findFromDatabase(filter, offset, limit);
      return resp;
    },
    {
      getKey: (filter, offset, limit) => {
        return hash(filter) + ':' + offset + ':' + limit;
      },
      expirationTtl: 5 * 60 * 1000,
      maxSize: Math.round(MAX_RESOURCES_TASK_COUNT * 1.5),
      autoStartGC: false
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
      subjects,
      before,
      after,
      search,
      include,
      keywords,
      exclude
    } = filter;

    const conds: (SQLWrapper | undefined)[] = [eq(resources.isDeleted, false)];

    if (provider) {
      conds.push(eq(resources.provider, provider));
    }

    if (!duplicate) {
      conds.push(isNull(resources.duplicatedId));
    }

    if ((fansubs && fansubs.length > 0) || (publishers && publishers.length > 0)) {
      const subConds: SQLWrapper[] = [];

      if (fansubs) {
        if (fansubs.length === 1) {
          subConds.push(eq(resources.fansubId, fansubs[0]));
        } else {
          subConds.push(inArray(resources.fansubId, fansubs));
        }
      }

      if (publishers) {
        if (publishers.length === 1) {
          subConds.push(eq(resources.publisherId, publishers[0]));
        } else {
          subConds.push(inArray(resources.publisherId, publishers));
        }
      }

      if (subConds.length === 1) {
        conds.push(subConds[0]);
      } else if (subConds.length > 1) {
        conds.push(or(...subConds)!);
      }
    }

    if (types && types.length > 0) {
      if (types.length === 1) {
        conds.push(eq(resources.type, types[0]));
      } else {
        conds.push(inArray(resources.type, types));
      }
    }

    if (subjects && subjects.length > 0) {
      if (subjects.length === 1) {
        conds.push(eq(resources.subjectId, subjects[0]));
      } else {
        conds.push(inArray(resources.subjectId, subjects));
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
      conds.push(sql`(${resources.titleSearch} @@ to_tsquery('simple', ${tsquery}))`);
    }

    if (include && include.length > 0) {
      if (include.length === 1) {
        conds.push(ilike(resources.titleAlt, `%${include[0]}%`));
      } else {
        const ic = or(...include.map((i) => ilike(resources.titleAlt, `%${i}%`)));
        ic && conds.push(ic);
      }
    }

    if (keywords && keywords.length > 0) {
      conds.push(...keywords.map((i) => ilike(resources.titleAlt, `%${i}%`)));
    }

    if (exclude && exclude.length > 0) {
      conds.push(...exclude.map((i) => notIlike(resources.titleAlt, `%${i}%`)));
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

    // 1. Intern resource.tracker
    for (const resource of resp) {
      resource.title = TitlePool.get(resource.title);
      resource.magnet = MagnetPool.get(resource.magnet);
      resource.tracker = TrackerPool.get(resource.tracker);
    }

    // 2. Intern resource object
    const cacheResources = this.resources;
    const internedResp = resp.map((resource) => {
      const { provider, providerId } = resource;
      const cache = cacheResources.get(provider)?.get(providerId);
      if (cache) {
        return cache;
      }
      if (!cacheResources.has(provider)) {
        cacheResources.set(provider, new Map());
      }
      cacheResources.get(provider)?.set(providerId, resource);
      return resource;
    });
    // -------------------------

    const end = performance.now();

    this.logger.info(
      `Finish selecting ${internedResp.length} resources in ${Math.floor(end - now)} ms from database: ${payload} (offset: ${offset}, limit: ${limit})`
    );

    return internedResp;
  }

  public async onNotifications(notification: Notification) {
    this.findFromRedis.clear();

    const removed = new Set([
      ...notification.resources.deleted,
      ...notification.duplicated.duplicated
    ]);

    const notified = [
      ...notification.resources.inserted.map((r) => r.id),
      ...notification.duplicated.inserted
    ];

    const resp = await retryFn(
      () =>
        this.system.database
          .select(RESOURCE_SELECTOR)
          .from(resources)
          .where(
            and(
              eq(resources.isDeleted, false),
              isNull(resources.duplicatedId),
              inArray(resources.id, notified)
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
        // Remove resources
        const realRemoved = removed.size > 0 ? task.removeResources(removed) : [];
        for (const r of realRemoved) {
          this.resources.get(r.provider as ProviderType)?.delete(r.providerId);
        }

        // Insert resources
        resp.length > 0 && task.insertResources(resp);
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
    if (!duplicate) {
      conds.push((r) => r.duplicatedId === null || r.duplicatedId === undefined);
    }

    if (
      (include && include.length > 0) ||
      (keywords && keywords.length > 0) ||
      (exclude && exclude.length > 0)
    ) {
      conds.push((r) => {
        const title = normalizeTitle(r.title).toLowerCase();
        return (
          (include?.some((i) => title.indexOf(i) !== -1) ?? true) &&
          (keywords?.every((i) => title.indexOf(i) !== -1) ?? true) &&
          (exclude?.every((i) => title.indexOf(i) === -1) ?? true)
        );
      });
    }
    if ((publishers && publishers.length > 0) || (fansubs && fansubs.length > 0)) {
      conds.push(
        (r) =>
          (publishers?.some((p) => r.publisherId === p) ?? false) ||
          (fansubs?.some((p) => r.fansubId === p) ?? false)
      );
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
    const resp = await this.query.findFromDatabase(
      this.options,
      count,
      RESOURCES_TASK_PREFETCH_COUNT + 1
    );
    this.resources = resp;
    this.prefetchCount += resp.length;
    this.hasMore = resp.length > RESOURCES_TASK_PREFETCH_COUNT;
    this.fetchedAt = new Date();
    this.ok = true;
    return;
  });

  public prefetchNextPage = memoAsync(async () => {
    if (!this.hasMore) return;

    const prevCount = this.prefetchCount;
    const resp = await this.query.findFromDatabase(
      this.options,
      prevCount,
      RESOURCES_TASK_PREFETCH_COUNT + 1
    );
    this.resources.push(...resp);
    this.prefetchCount += resp.length;
    this.hasMore = resp.length > RESOURCES_TASK_PREFETCH_COUNT;
    this.fetchedAt = new Date();
    this.ok = true;
    this.prefetchNextPage.clear();
    return;
  });

  public async fetch(options: DatabaseFilterOptions, page: number, pageSize: number) {
    const {
      provider,
      include,
      keywords,
      exclude,
      duplicate,
      publishers,
      fansubs,
      types,
      subjects,
      before,
      after
    } = options;
    const conds: Array<(r: DatabaseResource) => boolean> = [];

    if (provider) {
      conds.push((r) => r.provider === provider);
    }
    if (!duplicate) {
      conds.push((r) => r.duplicatedId === null || r.duplicatedId === undefined);
    }

    if (
      (include && include.length > 0) ||
      (keywords && keywords.length > 0) ||
      (exclude && exclude.length > 0)
    ) {
      conds.push((r) => {
        const title = normalizeTitle(r.title).toLowerCase();
        return (
          (include?.some((i) => title.indexOf(i) !== -1) ?? true) &&
          (keywords?.every((i) => title.indexOf(i) !== -1) ?? true) &&
          (exclude?.every((i) => title.indexOf(i) === -1) ?? true)
        );
      });
    }
    if (subjects && subjects.length > 0) {
      conds.push((r) => subjects.some((s) => r.subjectId === s));
    }
    if ((publishers && publishers.length > 0) || (fansubs && fansubs.length > 0)) {
      conds.push(
        (r) =>
          (publishers?.some((p) => r.publisherId === p) ?? false) ||
          (fansubs?.some((p) => r.fansubId === p) ?? false)
      );
    }
    if (types && types.length > 0) {
      conds.push((r) => types.some((t) => r.type === t));
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
        if ((page - 1) * pageSize <= matched && matched < page * pageSize) {
          slice.push(res);
        }
        matched++;
        if (matched >= page * pageSize) {
          break;
        }
      }
    }

    const hasMore = matched >= page * pageSize || this.hasMore;
    const ok = slice.length >= pageSize || !hasMore;

    return {
      ok,
      resources: slice,
      hasMore
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

  public removeResources(removed: Set<number>) {
    const realRemoved: DatabaseResource[] = [];
    this.resources = this.resources.filter((r) => {
      if (removed.has(r.id)) {
        realRemoved.push(r);
        return false;
      } else {
        return true;
      }
    });
    this.prefetchCount = this.resources.length;
    return realRemoved;
  }
}
