import type { Redis } from 'ioredis';
import type { ConsolaInstance } from 'consola';

import { hash } from 'ohash';
import { LRUCache } from 'lru-cache';
import {
  type SQLWrapper,
  sql,
  and,
  or,
  eq,
  gte,
  lte,
  isNull,
  desc,
  ilike,
  notIlike,
  inArray,
  notInArray
} from 'drizzle-orm';

import {
  type Jsonify,
  type ProviderType,
  type Resource,
  type ResolvedFilterOptions,
  MaxResourcesLimit,
  normalizeTitle,
  transformResourceHref
} from '@animegarden/client';
import {
  type ResourceCursor,
  encodeResourcesCursor,
  removePunctuations
} from '@animegarden/shared';

import type { Database } from '../connect/database.ts';
import type { System, Notification } from '../system/index.ts';

import { jieba } from '../utils/index.ts';
import { resources } from '../schema/resources.ts';
import { MAX_RESOURCES_TASK_COUNT } from '../constants.ts';
import { isDatabaseStatementTimeoutError, retryDatabaseFn } from '../utils/database.ts';
import { ResourcesSlowQueryBusyError, ResourcesSlowQueryTimeoutError } from '../error.ts';

import type {
  DatabaseResource,
  RedisQueryResource,
  DatabaseFilterOptions,
  ResolvedPaginationOptions
} from './types.ts';

import { transformDatabaseUser } from './transform.ts';
import { TitlePool, MagnetPool, TrackerPool } from './pool.ts';
import { BANGUMI_BANNED_FANSUBS, BANGUMI_BANNED_PUBLISHERS } from './filter.ts';

export type FoundResource = Omit<
  Jsonify<Resource<{ tracker: true; metadata: true }>>,
  'metadata'
> & {
  metadata: DatabaseResource['metadata'];
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
  indexedAt: resources.indexedAt,
  publisherId: resources.publisherId,
  fansubId: resources.fansubId,
  subjectId: resources.subjectId,
  isDeleted: resources.isDeleted,
  duplicatedId: resources.duplicatedId,
  metadata: resources.metadata
};

const RESOURCES_SLOW_QUERY_LOCK_NAMESPACE = 9_201;
const RESOURCES_SLOW_QUERY_LOCK_KEY = 1;
const RESOURCES_QUERY_CACHE_TTL_SECONDS = 5 * 60;
const RESOURCES_QUERY_BATCH_LIMIT = MaxResourcesLimit + 1;
const RESOURCES_TASK_TTL_MILLISECONDS = 2 * 60 * 60 * 1000;
const REDIS_QUERY_TIMEOUT_MS = 500;
const REDIS_QUERY_COOLDOWN_MS = 30_000;

export class QueryManager {
  public readonly system: System;

  private readonly logger: ConsolaInstance;

  private readonly redisQueryCache: RedisQueryCache;

  /** Exact query tasks retain one resolved batch and never prefetch subsequent cursors. */
  private readonly tasks = new LRUCache<string, Task>({
    max: MAX_RESOURCES_TASK_COUNT,
    ttl: RESOURCES_TASK_TTL_MILLISECONDS,
    ttlAutopurge: true,
    dispose: (task) => task.clear()
  });

  private slowQuerying = false;

  public constructor(system: System, logger: ConsolaInstance) {
    this.system = system;
    this.logger = logger.withTag('query');
    this.redisQueryCache = new RedisQueryCache(system, this.logger);
  }

  public async initialize() {
    if (!this.system.options.cron) {
      void this.find(
        {
          preset: 'bangumi',
          types: ['动画']
        },
        { limit: 100 }
      ).catch((error) => this.logger.error(error));
    }

    // 清空字符串常量池
    {
      let ev: NodeJS.Timeout;
      let stopped = false;
      const TIMEOUT = 24 * 60 * 60 * 1000;
      const handler = async () => {
        try {
          TitlePool.clear();
          MagnetPool.clear();
          TrackerPool.clear();
        } catch (error) {
          this.logger.error(error);
        } finally {
          if (!stopped) {
            ev = setTimeout(handler, TIMEOUT);
          }
        }
      };
      ev = setTimeout(handler, TIMEOUT);

      this.system.disposables.push(() => {
        stopped = true;
        clearTimeout(ev);
        this.tasks.clear();
      });
    }
  }

  /** Queries already-resolved pagination; missing cursor selects the latest first batch. */
  public async find(filter: ResolvedFilterOptions, pagination: ResolvedPaginationOptions) {
    const cursor = pagination.cursor ?? {
      anchor: this.system.modules.providers.timestamp.getTime()
    };
    const dbOptions = this.normalizeDatabaseFilterOptions(filter);
    const resp = await this.findFromTask(dbOptions, cursor);
    const hasMore = resp.length > pagination.limit;
    const foundResources = resp.slice(0, pagination.limit);

    const { users, teams } = this.system.modules;

    return {
      resources: await Promise.all(foundResources.map(async (r) => this.transform(r))),
      pagination: {
        anchor: cursor.anchor,
        limit: pagination.limit,
        nextCursor:
          hasMore && foundResources.length > 0
            ? encodeResourcesCursor({
                anchor: cursor.anchor,
                position: {
                  createdAt: foundResources.at(-1)!.createdAt.getTime(),
                  id: foundResources.at(-1)!.id
                }
              })
            : null,
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

  /** Converts a database resource into the byte-based representation exposed to consumers. */
  public async transform(r: DatabaseResource): Promise<FoundResource> {
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
      size: r.size * 1024,
      createdAt: r.createdAt.toISOString(),
      fetchedAt: r.fetchedAt.toISOString(),
      publisher: transformDatabaseUser(await users.getById(r.publisherId))!,
      fansub: r.fansubId ? transformDatabaseUser(await teams.getById(r.fansubId)) : undefined,
      subjectId: r.subjectId ?? undefined,
      metadata: r.metadata
    };
  }

  /** Runs one full-filter query task; the task caches only this exact keyset batch. */
  public async findFromTask(filter: DatabaseFilterOptions, cursor: ResourceCursor) {
    const key = getQueryHash(filter, cursor, this.system.modules.providers.timestamp.getTime());
    let task = this.tasks.get(key);
    if (!task) {
      task = new Task(this, filter, cursor);
      this.tasks.set(key, task);
    }
    return task.fetch();
  }

  private normalizeDatabaseFilterOptions(filter: ResolvedFilterOptions): DatabaseFilterOptions {
    const { users, teams } = this.system.modules;

    return {
      preset: filter.preset,
      provider: filter.provider,
      duplicate: filter.duplicate,
      // Unknown party names are intentionally discarded. If every supplied name is unknown, the
      // empty ID list is treated as no party filter rather than an empty result.
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

  /** Reads the exact Redis page first, then queries PostgreSQL and writes the same cache key. */
  public async findFromCacheOrDatabase(filter: DatabaseFilterOptions, cursor: ResourceCursor) {
    // Capture one cache generation so a provider refresh cannot move this query between keys.
    const key = this.redisQueryCache.getKey(filter, cursor);
    const cached = await this.redisQueryCache.read(key);
    if (cached) {
      return cached;
    }

    const resp = await this.findFromDatabase(filter, cursor, {
      allowSlowQueryFallback: true
    });
    // A cache outage must never delay a successful database response.
    void this.redisQueryCache.write(key, resp);
    return resp;
  }

  public async findFromDatabase(
    filter: DatabaseFilterOptions,
    cursor: ResourceCursor,
    options: {
      allowSlowQueryFallback?: boolean;

      database?: Database;

      lane?: string;
    } = {}
  ) {
    const database = options.database ?? this.system.database;
    const lane = options.lane ?? 'database';
    const payload = JSON.stringify(filter);
    const anchor = new Date(cursor.anchor);
    const createdAt = cursor.position ? new Date(cursor.position.createdAt) : undefined;
    const id = cursor.position?.id;
    const limit = RESOURCES_QUERY_BATCH_LIMIT;

    const {
      preset,
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

    const conds: SQLWrapper[] = [eq(resources.isDeleted, false), lte(resources.indexedAt, anchor)];

    if (createdAt !== undefined && id !== undefined) {
      conds.push(
        sql`(${resources.createdAt}, ${resources.id}) < (${sql.param(createdAt, resources.createdAt)}, ${sql.param(id, resources.id)})`
      );
    }

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

    // 支持 preset
    switch (preset) {
      case 'bangumi': {
        const bannedPublishers = BANGUMI_BANNED_PUBLISHERS.map(
          (name) => this.system.modules.users.getByName(name)?.id
        ).filter((id) => id !== undefined);
        if (bannedPublishers.length > 0) {
          conds.push(notInArray(resources.publisherId, bannedPublishers));
        }

        const bannedFansubs = BANGUMI_BANNED_FANSUBS.map(
          (name) => this.system.modules.teams.getByName(name)?.id
        ).filter((id) => id !== undefined);
        if (bannedFansubs.length > 0) {
          // `fansubId` is nullable; SQL NOT IN alone would discard publisher-only resources.
          conds.push(
            or(isNull(resources.fansubId), notInArray(resources.fansubId, bannedFansubs))!
          );
        }
        break;
      }
    }

    try {
      return await this.executeResourcesQuery(database, conds, limit, payload, lane);
    } catch (error) {
      if (
        options.allowSlowQueryFallback &&
        database === this.system.database &&
        this.system.slowDatabase &&
        this.system.slowQueryConnection &&
        isDatabaseStatementTimeoutError(error)
      ) {
        this.logger.warn(
          `Resources query timed out on default database lane, retrying with extended timeout: ${payload} (limit: ${limit})`
        );
        return await this.findFromSlowDatabase(conds, limit, payload);
      }

      throw error;
    }
  }

  private async executeResourcesQuery(
    database: Database,
    conds: SQLWrapper[],
    limit: number,
    payload: string,
    lane: string
  ) {
    const now = performance.now();

    this.logger.info(`Start executing resources query on ${lane}: ${payload} (limit: ${limit})`);

    const resp = await retryDatabaseFn(
      () =>
        database
          .select(RESOURCE_SELECTOR)
          .from(resources)
          .where(and(...conds))
          .orderBy(desc(resources.createdAt), desc(resources.id))
          .limit(limit),
      { count: 5 }
    );

    const internedResp = hydrateResources(resp);
    const end = performance.now();

    this.logger.info(
      `Finish selecting ${internedResp.length} resources in ${Math.floor(end - now)} ms from ${lane}: ${payload} (limit: ${limit})`
    );

    return internedResp;
  }

  private async findFromSlowDatabase(conds: SQLWrapper[], limit: number, payload: string) {
    if (!this.system.slowDatabase || !this.system.slowQueryConnection) {
      throw new ResourcesSlowQueryTimeoutError();
    }

    if (this.slowQuerying) {
      throw new ResourcesSlowQueryBusyError();
    }

    let locked = false;
    this.slowQuerying = true;

    try {
      locked = await this.tryAcquireSlowQueryLock();
      if (!locked) {
        throw new ResourcesSlowQueryBusyError();
      }

      return await this.executeResourcesQuery(
        this.system.slowDatabase,
        conds,
        limit,
        payload,
        'slow database'
      );
    } catch (error) {
      if (isDatabaseStatementTimeoutError(error)) {
        throw new ResourcesSlowQueryTimeoutError();
      }

      throw error;
    } finally {
      if (locked) {
        await this.releaseSlowQueryLock();
      }
      this.slowQuerying = false;
    }
  }

  private async tryAcquireSlowQueryLock() {
    const resp = (await this.system.slowQueryConnection!.unsafe(
      'SELECT pg_try_advisory_lock($1, $2) AS locked',
      [RESOURCES_SLOW_QUERY_LOCK_NAMESPACE, RESOURCES_SLOW_QUERY_LOCK_KEY]
    )) as Array<{ locked?: boolean }>;

    return resp[0]?.locked === true;
  }

  private async releaseSlowQueryLock() {
    await this.system.slowQueryConnection!.unsafe('SELECT pg_advisory_unlock($1, $2)', [
      RESOURCES_SLOW_QUERY_LOCK_NAMESPACE,
      RESOURCES_SLOW_QUERY_LOCK_KEY
    ]);
  }

  /** Invalidates exact in-process tasks after the providers module advances the cache generation. */
  public onNotifications(_notification: Notification) {
    this.tasks.clear();
  }
}

/** Best-effort Redis batch cache; owns wire serialization, TTL and cache-outage isolation. */
class RedisQueryCache {
  private readonly system: System;

  private readonly logger: ConsolaInstance;

  private disabledUntil = 0;

  public constructor(system: System, logger: ConsolaInstance) {
    this.system = system;
    this.logger = logger;
  }

  /** Capture the provider generation once and use this key for both reading and writing. */
  public getKey(filter: DatabaseFilterOptions, cursor: ResourceCursor) {
    const queryHash = getQueryHash(
      filter,
      cursor,
      this.system.modules.providers.timestamp.getTime()
    );
    return `animegarden:resources:query:${queryHash}`;
  }

  /** Cache misses and cache failures both allow the caller to query PostgreSQL. */
  public async read(key: string) {
    return this.run(async (redis) => {
      const cached = await redis.get(key);
      if (cached) {
        this.logger.info(`Redis cache hit ${key}`);
        return hydrateResources(JSON.parse(cached) as RedisQueryResource[]);
      }
    });
  }

  /** Handles all write failures internally so persistence can run in the background. */
  public async write(key: string, resources: DatabaseResource[]) {
    await this.run(async (redis) => {
      await redis.set(key, JSON.stringify(resources), 'EX', RESOURCES_QUERY_CACHE_TTL_SECONDS);
    });
  }

  /** Bounds cache latency and bypasses reads and writes briefly after any cache failure. */
  private async run<T>(operation: (redis: Redis) => Promise<T>) {
    const redis = this.system.publisherRedis;
    if (!redis || redis.status !== 'ready' || Date.now() < this.disabledUntil) {
      return undefined;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('Redis query cache timed out')),
          REDIS_QUERY_TIMEOUT_MS
        );
      });
      return await Promise.race([operation(redis), timeout]);
    } catch (error) {
      const now = Date.now();
      if (now >= this.disabledUntil) {
        this.logger.warn('Redis query cache unavailable; bypassing for 30 seconds', error);
      }
      this.disabledUntil = now + REDIS_QUERY_COOLDOWN_MS;
      return undefined;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
}

/** Task and Redis caches use the same full-filter, position and provider-generation identity. */
function getQueryHash(
  filter: DatabaseFilterOptions,
  cursor: ResourceCursor,
  providerTimestamp: number
) {
  return hash({ filter, cursor, providerTimestamp });
}

/** Normalize database/cache rows through the same date and string-pool handling. */
function hydrateResources(resp: Array<DatabaseResource | RedisQueryResource>): DatabaseResource[] {
  return resp.map((resource) => ({
    ...resource,
    title: TitlePool.get(resource.title),
    magnet: MagnetPool.get(resource.magnet),
    tracker: TrackerPool.get(resource.tracker),
    createdAt: new Date(resource.createdAt),
    fetchedAt: new Date(resource.fetchedAt),
    indexedAt: new Date(resource.indexedAt)
  }));
}

/**
 * One exact resource query batch. It deduplicates callers and retains the resolved batch, but it
 * never broadens filters or prefetches another cursor.
 */
export class Task {
  private readonly query: QueryManager;

  private readonly filter: DatabaseFilterOptions;

  private readonly cursor: ResourceCursor;

  private fetching: Promise<DatabaseResource[]> | undefined;

  private revision = 0;

  private resources: DatabaseResource[] | undefined;

  public constructor(query: QueryManager, filter: DatabaseFilterOptions, cursor: ResourceCursor) {
    this.query = query;
    this.filter = filter;
    this.cursor = cursor;
  }

  /** Returns this exact batch, sharing both an in-flight query and its resolved result. */
  public async fetch() {
    if (this.resources) {
      return this.resources;
    }
    if (this.fetching) {
      return this.fetching;
    }

    const revision = this.revision;
    const fetching = this.query
      .findFromCacheOrDatabase(this.filter, this.cursor)
      .then((resources) => {
        if (this.revision === revision) {
          this.resources = resources;
        }
        return resources;
      })
      .finally(() => {
        if (this.fetching === fetching) {
          this.fetching = undefined;
        }
      });

    this.fetching = fetching;
    return fetching;
  }

  /** Invalidates the retained batch without allowing an older in-flight query to repopulate it. */
  public clear() {
    this.revision += 1;
    this.resources = undefined;
    this.fetching = undefined;
  }
}
