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

import { normalizeTitle, type ResolvedFilterOptions, SupportProviders } from '@animegarden/client';

import type { System } from '../system';
import type { NotifiedResources } from '../providers/types';

import { jieba, retryFn } from '../utils';
import { resources } from '../schema/resources';

import type { DatabaseResource } from './types';

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

export class QueryManager {
  private readonly system: System;

  private readonly logger: ConsolaInstance;

  private readonly tasks: Map<string, Task> = new Map();

  public constructor(system: System) {
    this.system = system;
    this.logger = system.logger.withTag('query');
  }

  public async initialize() {
    await this.find({
      page: 1,
      pageSize: 100,
      providers: [...SupportProviders],
      duplicate: false,
      types: ['动画']
    });

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

    const { users, teams, subjects } = this.system.modules;

    return {
      resources: await Promise.all(
        resources.map(async (r) => ({
          id: r.id,
          provider: r.provider,
          providerId: r.providerId,
          title: r.title,
          href: r.href, // TODO
          type: r.type,
          magnet: r.magnet,
          tracker: r.tracker,
          size: r.size,
          createdAt: r.createdAt.toISOString(),
          fetchedAt: r.fetchedAt.toISOString(),
          publisher: await users.getById(r.publisherId),
          fansub: r.fansubId ? await teams.getById(r.fansubId) : undefined,
          subjectId: r.subjectId,
          metadata: r.metadata
        }))
      ),
      complete: !hasMore,
      filter: {
        page: filter.page,
        pageSize: filter.pageSize,
        ...dbOptions,
        publishers: dbOptions.publishers?.map((p) => users.ids.get(p)?.name!),
        fansubs: dbOptions.fansubs?.map((p) => teams.ids.get(p)?.name!),
        before: dbOptions.before?.toISOString(),
        after: dbOptions.after?.toISOString(),
        subjects: dbOptions.subjects?.map((i) => subjects.getSubjectById(i))
      }
    };
  }

  public async findFromTask(dbOptions: DatabaseFilterOptions, page: number, pageSize: number) {
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
      // 5. 类型
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
      }
    }

    // 回退到直接查数据库, TODO: 标记回退的请求
    const resp = await this.findFromDatabase(dbOptions, (page - 1) * pageSize, pageSize + 1);
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

    // 1. 清理或者重试过期的缓存, TODO

    // 2. 清理多余的缓存, TODO
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
        }
      }
    }
  }

  private normalizeDatabaseFilterOptions(filter: ResolvedFilterOptions): DatabaseFilterOptions {
    const { users, teams, subjects } = this.system.modules;

    return {
      providers: filter.providers,
      duplicate: filter.duplicate,
      publishers: filter.publishers
        ?.map((p) => users.getByName(p)?.id)
        .filter((p) => p !== undefined),
      fansubs: filter.fansubs?.map((p) => teams.getByName(p)?.id).filter((p) => p !== undefined),
      types: filter.types,
      before: filter.before,
      after: filter.after,
      // Map from bgm id to subject id
      subjects: filter.subjects
        ?.map((s) => subjects.getSubject(s)?.id)
        .filter((s) => s !== undefined),
      search: filter.search?.map((t) => normalizeTitle(t)),
      include: filter.include?.map((t) => normalizeTitle(t)),
      keywords: filter.keywords?.map((t) => normalizeTitle(t)),
      exclude: filter.exclude?.map((t) => normalizeTitle(t))
    };
  }

  public async findFromDatabase(filter: DatabaseFilterOptions, offset: number, limit: number) {
    const now = performance.now();
    const payload = JSON.stringify(filter);
    this.logger.info(
      `Start executing resources query on database: ${payload} (offset: ${offset}, limit: ${limit})`
    );

    const {
      providers,
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

    if (providers && providers.length > 0 && providers.length < SupportProviders.length) {
      if (providers.length === 1) {
        conds.push(eq(resources.provider, providers[0]));
      } else {
        conds.push(inArray(resources.provider, providers));
      }
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
          .select({
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
          })
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
    const resp = await retryFn(
      () =>
        this.system.database
          .select({
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
          })
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

    // TODO: insert resources
  }
}

export class Task {
  private readonly query: QueryManager;

  public readonly key: string;

  public readonly options: DatabaseFilterOptions;

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
  }

  public visit() {
    this.visited.count += 1;
    this.visited.last = new Date();
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
    const { publishers, fansubs, types, subjects, before, after } = options;
    const conds: Array<(r: DatabaseResource) => boolean> = [];
    if (publishers && publishers.length > 0) {
      conds.push((r) => publishers.some((p) => r.publisherId === p));
    }
    if (fansubs && fansubs.length > 0) {
      conds.push((r) => fansubs.some((p) => r.publisherId === p));
    }
    if (types && types.length > 0) {
      conds.push((r) => types.some((t) => r.type === t));
    }
    if (subjects && subjects.length > 0) {
      conds.push((r) => subjects.some((s) => r.subjectId === s));
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
}
