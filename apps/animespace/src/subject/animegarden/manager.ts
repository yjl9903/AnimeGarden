import createDebug from 'debug';
import { sql, eq, gt, desc, inArray } from 'drizzle-orm';

import {
  type Resource,
  type FilterOptions,
  type FetchResourcesResult,
  type ResolvedFilterOptions,
  fetchResources as fetchAnimeGardenResources,
  makeResourcesFilter,
  normalizeTitle,
  stringifyURLSearch,
  parseURLSearch
} from '@animegarden/client';
import { removePunctuations } from '@animegarden/shared';

import type { System } from '../../system/system.ts';
import type { Database } from '../../sqlite/types.ts';

import { jieba } from '../../utils/jieba';
import { memoAsync } from '../../utils/result.ts';
import { resources, filters, filterResources } from '../../sqlite/animegarden.ts';
import { getMetadata, MetadataKey, setMetadata } from '../../sqlite/metadata.ts';

import type { SubjectResource } from '../source/resource.ts';

type SourceFetchResult = FetchResourcesResult<{ tracker: true }>;

const debug = createDebug('animespace:animegarden');

// 跳过 sync 的时间间隔
const SKIP_SYNC_INTERVAL = 2 * 60 * 1000;

// 缓存过期时间
const CacheStaleDurationMs = 7 * 24 * 60 * 60 * 1000;

// 连续几页没有数据后停止
const MaxConsecutiveNoMissingPages = 1;

// 同步时最多抓取的页数
const MaxFetchedPage = 10;

export class AnimeGardenSourceManager {
  private latestFetchedAt!: Date;

  public constructor(private readonly system: System) {}

  public initialize = memoAsync(async () => {
    debug('start initializing');

    const database = await this.system.openDatabase();

    const latestSyncedAt = await getMetadata<number>(
      database,
      MetadataKey.ANIMEGARDEN_SYNCED_AT,
      0
    );

    const [latestLocalResource] = await database
      .select({
        createdAt: resources.createdAt,
        fetchedAt: resources.fetchedAt
      })
      .from(resources)
      .orderBy(desc(resources.createdAt), desc(resources.fetchedAt))
      .limit(1)
      .execute();

    if (
      latestSyncedAt.ok &&
      latestLocalResource &&
      new Date().getTime() - latestSyncedAt.value < SKIP_SYNC_INTERVAL
    ) {
      this.latestFetchedAt = latestLocalResource.fetchedAt;
      debug('skip initializing');
      return;
    }

    const shouldResetDatabase =
      !latestLocalResource ||
      Date.now() - latestLocalResource.createdAt.getTime() >= CacheStaleDurationMs;
    if (shouldResetDatabase) {
      debug('clear database');
      await this.clearResources(database);
      this.latestFetchedAt = new Date(0);
    } else {
      this.latestFetchedAt = latestLocalResource.fetchedAt;
      debug('latest local resource', this.latestFetchedAt.toLocaleString());
    }

    const shouldSync = !!latestLocalResource && !shouldResetDatabase;
    await this.syncLatestResources(database, shouldSync);

    await setMetadata(database, MetadataKey.ANIMEGARDEN_SYNCED_AT, new Date().getTime());

    debug('finish initializing ok', this.latestFetchedAt.toLocaleString());
  });

  public close(): void {
    this.initialize.clear();
  }

  public async fetchResources(
    filter: FilterOptions = {},
    forceRefresh = false
  ): Promise<SourceFetchResult> {
    await this.initialize();
    return this.queryResources(filter, forceRefresh);
  }

  public transformSubjectResource(resource: Resource<{ tracker: true }>): SubjectResource {
    return {
      name: resource.title,
      url: `https://animes.garden/detail/${resource.provider}/${resource.providerId}`,
      metadata: {
        fansub: resource.fansub?.name || resource.publisher.name
      },
      magnet: `${resource.magnet}${resource.tracker}`,
      animegarden: resource,
      createdAt: resource.createdAt
    };
  }

  private async queryResources(
    filter: FilterOptions,
    forceRefresh: boolean
  ): Promise<SourceFetchResult> {
    debug('start query resources', `force=${forceRefresh ? 'true' : 'false'}`, filter);

    const database = await this.system.openDatabase();

    const { filter: resolvedFilter } = parseURLSearch(undefined, filter);
    const key = stringifyURLSearch(resolvedFilter).toString();

    const dbFilter = await this.findFilter(database, key);
    const dbFilterResources =
      dbFilter !== undefined ? await this.loadFilterResources(database, dbFilter.id) : [];

    if (
      !forceRefresh &&
      dbFilter !== undefined &&
      !(await this.hasNewMatchedResources(database, resolvedFilter, dbFilter.fetchedAt))
    ) {
      debug('hit query resources cache', key, this.latestFetchedAt.toLocaleString());

      return makeCachedResponse(dbFilterResources, resolvedFilter, this.latestFetchedAt);
    }

    const remote = await fetchAnimeGardenResources({
      ...filter,
      tracker: true
    });
    if (!remote.ok) {
      throw remote.error ?? new Error('Failed to fetch resources from AnimeGarden.');
    }
    this.latestFetchedAt = new Date(
      Math.max(
        this.latestFetchedAt.getTime(),
        remote.timestamp.getTime(),
        ...remote.resources.map((resource) => resource.fetchedAt.getTime())
      )
    );

    const refreshedFilter = await this.replaceFilterResources(
      database,
      key,
      resolvedFilter,
      remote.resources
    );
    const refreshedResources = await this.loadFilterResources(database, refreshedFilter.id);

    debug('finish query resources', key, this.latestFetchedAt.toLocaleString());

    return makeCachedResponse(refreshedResources, resolvedFilter, this.latestFetchedAt);
  }

  private async findFilter(database: Database, key: string) {
    return (
      await database.select().from(filters).where(eq(filters.key, key)).limit(1).execute()
    )[0];
  }

  private async hasNewMatchedResources(
    database: Database,
    filter: ResolvedFilterOptions,
    fetchedAt: Date
  ) {
    const predicate = makeResourcesFilter(filter);

    const searchKeywords = filter.search?.flatMap((value) =>
      jieba.cut(removePunctuations(normalizeTitle(value).toLocaleLowerCase()))
    );

    const candidates = await database
      .select()
      .from(resources)
      .where(gt(resources.fetchedAt, fetchedAt))
      .execute();

    return candidates.some((row) => {
      if (!predicate(row)) {
        return false;
      }
      // @hack 原本是 jieba
      if (!searchKeywords || searchKeywords.length === 0) {
        return true;
      }
      const title = new Set(
        jieba.cut(removePunctuations(normalizeTitle(row.title).toLocaleLowerCase()))
      );
      return searchKeywords.some((keyword) => title.has(keyword));
    });
  }

  private async loadFilterResources(
    database: Database,
    filterId: number
  ): Promise<Resource<{ tracker: true }>[]> {
    const rows = await database
      .select({
        resource: resources
      })
      .from(filterResources)
      .innerJoin(resources, eq(filterResources.resourceId, resources.id))
      .where(eq(filterResources.filterId, filterId))
      .orderBy(desc(resources.createdAt), desc(resources.fetchedAt))
      .execute();
    return rows.map((row) => row.resource);
  }

  private async replaceFilterResources(
    database: Database,
    key: string,
    normalizedFilter: ResolvedFilterOptions,
    fetchedResources: Resource[]
  ) {
    // 1. Upsert cached resources
    await this.upsertResources(database, fetchedResources);

    // 2. Upsert filter fetchedAt
    const now = new Date();
    const fetchedAt = this.latestFetchedAt;
    const [dbFilter] = await database
      .insert(filters)
      .values({
        key,
        filter: normalizedFilter,
        createdAt: now,
        fetchedAt: fetchedAt
      })
      .onConflictDoUpdate({
        target: filters.key,
        set: {
          filter: normalizedFilter,
          fetchedAt: fetchedAt
        }
      })
      .returning()
      .execute();

    // 3. Cleanup cached filter resources relation
    await database
      .delete(filterResources)
      .where(eq(filterResources.filterId, dbFilter.id))
      .execute();

    // 4. Insert filter resources
    if (fetchedResources.length > 0) {
      await database
        .insert(filterResources)
        .values(
          fetchedResources.map((resource) => ({
            filterId: dbFilter.id,
            resourceId: resource.id
          }))
        )
        .onConflictDoNothing()
        .execute();
    }

    return dbFilter;
  }

  private async upsertResources(database: Database, fetchedResources: Resource[]) {
    if (fetchedResources.length === 0) {
      return;
    }

    const resp = await database
      .insert(resources)
      .values(
        fetchedResources.map((resource) => ({
          id: resource.id,
          provider: resource.provider,
          providerId: resource.providerId,
          title: resource.title,
          href: resource.href,
          type: resource.type,
          magnet: resource.magnet,
          tracker: resource.tracker ?? '',
          size: resource.size,
          publisher: resource.publisher,
          fansub: resource.fansub,
          createdAt: resource.createdAt,
          fetchedAt: resource.fetchedAt
        }))
      )
      .onConflictDoUpdate({
        target: [resources.provider, resources.providerId],
        set: {
          title: sql`excluded.title`,
          href: sql`excluded.href`,
          type: sql`excluded.type`,
          magnet: sql`excluded.magnet`,
          tracker: sql`excluded.tracker`,
          size: sql`excluded.size`,
          publisher: sql`excluded.publisher`,
          fansub: sql`excluded.fansub`,
          createdAt: sql`excluded.created_at`,
          fetchedAt: sql`excluded.fetched_at`
        }
      })
      .returning({ id: resources.id })
      .execute();

    return resp.length;
  }

  private async syncLatestResources(database: Database, continuous: boolean) {
    let page = 1;
    const pageSize = 1000;

    let consecutiveNoMissingPages = 0;

    debug('start syncing latest resources', `coutinuous=${continuous ? 'true' : 'false'}`);

    while (true) {
      debug('fetch resources', `page=${page}`, `size=${pageSize}`);

      const remote = await fetchAnimeGardenResources({
        page,
        pageSize: 1000,
        type: '动画',
        tracker: true
      });

      if (!remote.ok || !remote.timestamp) {
        throw remote.error ?? new Error('Failed to initialize AnimeGarden source manager.');
      }

      const missingCount = await this.countMissingResources(database, remote.resources);
      if (missingCount === 0) {
        consecutiveNoMissingPages += 1;
      } else {
        consecutiveNoMissingPages = 0;
      }

      const upserted = await this.upsertResources(database, remote.resources);

      this.latestFetchedAt = new Date(
        Math.max(
          this.latestFetchedAt.getTime(),
          remote.timestamp.getTime(),
          ...remote.resources.map((resource) => resource.fetchedAt.getTime())
        )
      );

      debug(
        'fetched missing resources',
        missingCount,
        upserted,
        this.latestFetchedAt.toLocaleString()
      );

      if (!continuous) {
        break;
      }
      if (remote.resources.length === 0 || remote.pagination.complete) {
        break;
      }
      if (consecutiveNoMissingPages >= MaxConsecutiveNoMissingPages) {
        break;
      }
      if (page > MaxFetchedPage) {
        await this.clearFilters(database);
        break;
      }

      page += 1;

      await new Promise((res) => setTimeout(res, 1000));
    }
  }

  private async countMissingResources(database: Database, fetchedResources: Resource[]) {
    if (fetchedResources.length === 0) {
      return 0;
    }

    const ids = [...new Set(fetchedResources.map((resource) => resource.id))];
    const existed = await database
      .select({
        id: resources.id
      })
      .from(resources)
      .where(inArray(resources.id, ids))
      .execute();
    const existedIds = new Set(existed.map((row) => row.id));

    return ids.filter((id) => !existedIds.has(id)).length;
  }

  private async clearFilters(database: Database) {
    database.transaction((tx) => {
      tx.delete(filterResources).execute();
      tx.delete(filters).execute();
    });
  }

  private async clearResources(database: Database) {
    database.transaction((tx) => {
      tx.delete(filterResources).execute();
      tx.delete(filters).execute();
      tx.delete(resources).execute();
    });
  }
}

function makeCachedResponse(
  resources: Resource[],
  filter: ResolvedFilterOptions,
  timestamp: Date
): SourceFetchResult {
  return {
    ok: true,
    resources,
    filter,
    pagination: {
      page: 1,
      pageSize: resources.length,
      complete: true
    },
    timestamp,
    error: undefined
  };
}
