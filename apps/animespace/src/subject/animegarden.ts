import { sql, eq, gt, asc, desc, inArray } from 'drizzle-orm';

import {
  type Resource,
  type FilterOptions,
  type FetchResourcesOptions,
  type FetchResourcesResult,
  type ResolvedFilterOptions,
  fetchResources as fetchAnimeGardenResources,
  makeResourcesFilter,
  normalizeTitle,
  stringifyURLSearch,
  parseURLSearch
} from '@animegarden/client';

import type { System } from '../system/system.ts';
import type { Database } from '../sqlite/types.ts';

import { memoAsync } from '../utils/result.ts';
import { resources, filters, filterResources } from '../sqlite/animegarden.ts';

type SourceFetchResult = FetchResourcesResult<FetchResourcesOptions>;

const CacheStaleDurationMs = 7 * 24 * 60 * 60 * 1000;

const MaxConsecutiveNoMissingPages = 3;

export class AnimeGardenSourceManager {
  private latestFetchedAt!: Date;

  public constructor(private readonly system: System) {}

  public initialize = memoAsync(async () => {
    const database = await this.system.openDatabase();
    const [latestLocalResource] = await database
      .select({
        createdAt: resources.createdAt,
        fetchedAt: resources.fetchedAt
      })
      .from(resources)
      .orderBy(desc(resources.createdAt), desc(resources.fetchedAt))
      .limit(1)
      .execute();

    const shouldResetDatabase =
      !latestLocalResource ||
      Date.now() - latestLocalResource.createdAt.getTime() >= CacheStaleDurationMs;
    if (shouldResetDatabase) {
      await this.clearDatabase(database);
      this.latestFetchedAt = new Date(0);
    } else {
      this.latestFetchedAt = latestLocalResource.fetchedAt;
    }

    const shouldSync = !!latestLocalResource && !shouldResetDatabase;
    await this.syncLatestResources(database, shouldSync);
  });

  public async fetchResources(filter: FilterOptions = {}): Promise<SourceFetchResult> {
    await this.initialize();
    return this.queryResources(filter, false);
  }

  public async refresh(filter: FilterOptions = {}): Promise<SourceFetchResult> {
    await this.initialize();
    return this.queryResources(filter, true);
  }

  public close(): void {
    this.initialize.clear();
  }

  private async queryResources(
    filter: FilterOptions,
    forceRefresh: boolean
  ): Promise<SourceFetchResult> {
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
    const searchKeywords = filter.search?.map((value) => normalizeTitle(value).toLocaleLowerCase());
    const predicate = makeResourcesFilter(filter);

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
      const title = normalizeTitle(row.title).toLocaleLowerCase();
      return searchKeywords.some((keyword) => title.includes(keyword));
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
      .orderBy(desc(resources.createdAt), asc(resources.provider), desc(resources.fetchedAt))
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

    return resp.length > 0;
  }

  private async syncLatestResources(database: Database, continuous: boolean) {
    let page = 1;
    let consecutiveNoMissingPages = 0;

    while (true) {
      const remote = await fetchAnimeGardenResources({
        page,
        pageSize: 100,
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

      await this.upsertResources(database, remote.resources);

      this.latestFetchedAt = new Date(
        Math.max(
          this.latestFetchedAt.getTime(),
          remote.timestamp.getTime(),
          ...remote.resources.map((resource) => resource.fetchedAt.getTime())
        )
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

      page += 1;
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

  private async clearDatabase(database: Database) {
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
