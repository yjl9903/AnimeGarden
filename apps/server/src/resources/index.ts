import { and, desc, eq, gt, inArray, isNull, lt, or, sql } from 'drizzle-orm';

import type { ProviderType } from '@animegarden/client';

import { retryFn } from '@animegarden/shared';

import type { System, Notification } from '../system';
import type { NewResource as NewDbResource } from '../schema';

import { Module } from '../system/module';
import { resources as resourceSchema } from '../schema/resources';

import type { InsertResourcesOptions, NewResource } from './types';

import { QueryManager } from './query';
import { DetailsManager } from './details';
import { prefetchKeepShare } from './keepshare';
import { transformNewResources } from './transform';

export * from './types';

export class ResourcesModule extends Module<System['modules']> {
  public static name = 'resources';

  public readonly query: QueryManager;

  public readonly details: DetailsManager;

  public constructor(sys: System, name?: string) {
    super(sys, name || ResourcesModule.name);
    this.query = new QueryManager(sys, this.logger);
    this.details = new DetailsManager(sys, this.logger);
  }

  public async initialize() {
    this.logger.info('Initializing Resources module');
    await this.query.initialize();
    await this.details.initialize();
    this.logger.success('Initialize Resources module OK');
  }

  public async refresh(notification: Notification) {
    this.logger.info('Refreshing Resources module');
    await this.query.onNotifications(notification);
    this.logger.success('Refresh Resources module OK');
  }

  /**
   * Check whether each input provider id has been inserted to DB
   *
   * @param provider
   * @param ids provider id set
   * @returns
   */
  public async getResourcesByProviderId(provider: string, ids: string[]) {
    return await this.database
      .select({ provider: resourceSchema.provider, providerId: resourceSchema.providerId })
      .from(resourceSchema)
      .where(
        and(
          eq(resourceSchema.provider, provider as ProviderType),
          inArray(resourceSchema.providerId, ids)
        )
      );
  }

  /**
   * Insert resources to DB
   *
   * @param resources
   * @param options
   * @returns
   */
  public async insertResources(resources: NewResource[], options: InsertResourcesOptions = {}) {
    const map = new Map<string, NonNullable<ReturnType<typeof transformNewResources>['result']>>();
    const newResources: NewDbResource[] = [];
    const errors = [];
    const duplicated: number[] = [];

    for (const r of resources) {
      const key = `${r.provider}:${r.providerId}`;
      if (map.has(key)) continue;

      const res = transformNewResources(this.system, r, options);
      if (!res.errors && res.result) {
        map.set(key, res.result);
        newResources.push(res.result);
      } else {
        errors.push(r);
      }
    }

    if (newResources.length === 0) return { inserted: [], conflict: [], errors: [], duplicated };

    const resp = await retryFn(
      () =>
        this.database
          .insert(resourceSchema)
          .values(
            newResources.map((r) => {
              const search1 = r.titleSearch[0] ? r.titleSearch[0].join(' ') : undefined;
              const search2 = r.titleSearch[3] ? r.titleSearch[3].join(' ') : undefined;

              const titleSearch =
                search1 && search2
                  ? sql`(setweight(to_tsvector('simple', ${search1}), 'A') || setweight(to_tsvector('simple', ${search2}), 'D'))`
                  : search1
                    ? sql`setweight(to_tsvector('simple', ${search1}), 'A')`
                    : sql`setweight(to_tsvector('simple', ${search2 ?? ''}), 'D')`;

              // 1. provider is different
              // 2. exisit, isDeleted = false
              // 3. root resource has no duplicated id, duplicatedId is null
              // 4. Same magnet or same title
              const duplicatedId =
                r.magnet && r.title
                  ? sql`(SELECT ${resourceSchema.id}
FROM ${resourceSchema}
WHERE (${eq(resourceSchema.isDeleted, false)})
AND (${isNull(resourceSchema.duplicatedId)})
AND (${lt(resourceSchema.createdAt, r.createdAt!)})
AND (${eq(resourceSchema.title, r.title)} OR ${eq(resourceSchema.magnet, r.magnet)})
ORDER BY ${resourceSchema.createdAt} asc
LIMIT 1)`
                  : undefined;

              return {
                ...r,
                titleSearch,
                duplicatedId
              };
            })
          )
          .onConflictDoNothing()
          .returning({
            id: resourceSchema.id,
            provider: resourceSchema.provider,
            providerId: resourceSchema.providerId,
            title: resourceSchema.title,
            magnet: resourceSchema.magnet,
            createdAt: resourceSchema.createdAt,
            isDeleted: resourceSchema.isDeleted,
            duplicatedId: resourceSchema.duplicatedId
          }),
      5
    );

    const conflict: NonNullable<ReturnType<typeof transformNewResources>['result']>[] = [];
    if (resp.length < newResources.length) {
      for (const r of resp) {
        map.delete(`${r.provider}:${r.providerId}`);
      }
      conflict.push(...map.values());
    }

    if (options.updateDuplicatedId) {
      for (const r of resp) {
        if (r.isDeleted) continue;
        if (r.duplicatedId) continue;

        // Update duplicated id which createdAt > r.createdAt
        const resp = await retryFn(
          () =>
            this.database
              .update(resourceSchema)
              .set({
                duplicatedId: r.id
              })
              .where(
                and(
                  eq(resourceSchema.isDeleted, false),
                  isNull(resourceSchema.duplicatedId),
                  gt(resourceSchema.createdAt, r.createdAt!),
                  or(eq(resourceSchema.title, r.title), eq(resourceSchema.magnet, r.magnet))
                )
              )
              .returning({ id: resourceSchema.id }),
          5
        );
        duplicated.push(...resp.map((r) => r.id));
      }
    }

    // prefetch keepshare
    if (options.keepshare) {
      prefetchKeepShare(resp);
    }

    return {
      inserted: resp,
      conflict,
      errors,
      duplicated: [...new Set(duplicated)]
    };
  }

  public async updateResource(resource: NewResource, fetchedAt?: Date) {
    const { result: updated } = transformNewResources(this.system, resource, {
      indexSubject: true
    });
    if (!updated) return;
    const dbRes = await retryFn(
      () =>
        this.database.query.resources.findFirst({
          where: and(
            eq(resourceSchema.provider, updated.provider),
            eq(resourceSchema.providerId, updated.providerId)
          )
        }),
      5
    ).catch(() => undefined);
    if (!dbRes) {
      const { inserted, duplicated } = await this.insertResources([{ ...resource, fetchedAt }], {
        indexSubject: true,
        updateDuplicatedId: true
      });
      return { updated: inserted[0], inserted: [], duplicated };
    }

    let changed = false;
    const set: Partial<typeof resourceSchema.$inferInsert> = {};

    if ((updated.isDeleted ?? false) !== dbRes.isDeleted) {
      changed = true;
      set.isDeleted = updated.isDeleted ?? false;
    }

    if (updated.href !== dbRes.href) {
      changed = true;
      set.href = updated.href;
    }

    if (updated.magnet !== dbRes.magnet) {
      changed = true;
      set.magnet = updated.magnet;
    }

    if (updated.tracker !== dbRes.tracker) {
      changed = true;
      set.tracker = updated.tracker;
    }

    if (updated.subjectId !== dbRes.subjectId) {
      changed = true;
      set.subjectId = updated.subjectId;
    }

    if (updated.publisherId !== dbRes.publisherId) {
      changed = true;
      set.publisherId = dbRes.publisherId;
    }

    if (updated.fansubId !== dbRes.fansubId) {
      changed = true;
      set.fansubId = updated.fansubId;
    }

    if (updated.title !== dbRes?.title) {
      changed = true;
      set.title = updated.title;
      set.titleAlt = updated.titleAlt;

      // title search
      const search1 = updated.titleSearch[0] ? updated.titleSearch[0].join(' ') : undefined;
      const search2 = updated.titleSearch[3] ? updated.titleSearch[3].join(' ') : undefined;

      const titleSearch =
        search1 && search2
          ? sql`(setweight(to_tsvector('simple', ${search1}), 'A') || setweight(to_tsvector('simple', ${search2}), 'D'))`
          : search1
            ? sql`setweight(to_tsvector('simple', ${search1}), 'A')`
            : sql`setweight(to_tsvector('simple', ${search2 ?? ''}), 'D')`;

      // @ts-ignore
      set.titleSearch = titleSearch;
    }

    // Do update
    if (changed) {
      // Update fetched at
      set.fetchedAt = fetchedAt ?? new Date();
    }

    // Force updating duplicated id
    // @ts-ignore
    set.duplicatedId = sql`(SELECT ${resourceSchema.id}
FROM ${resourceSchema}
WHERE (${eq(resourceSchema.isDeleted, false)})
AND (${isNull(resourceSchema.duplicatedId)})
AND (${lt(resourceSchema.createdAt, updated.createdAt!)})
AND (${eq(resourceSchema.title, updated.title)} OR ${eq(resourceSchema.magnet, updated.magnet)})
ORDER BY ${resourceSchema.createdAt} asc
LIMIT 1)`;

    const resp1 = await retryFn(
      () =>
        this.database
          .update(resourceSchema)
          .set(set)
          .where(
            and(
              eq(resourceSchema.provider, updated.provider),
              eq(resourceSchema.providerId, updated.providerId)
            )
          )
          .returning({
            id: resourceSchema.id,
            provider: resourceSchema.provider,
            providerId: resourceSchema.providerId,
            title: resourceSchema.title
          }),
      5
    ).catch(() => undefined);

    const id = resp1?.[0].id;
    if (resp1 && resp1.length === 1 && id) {
      // Clearing all the related duplicated item
      const resp2 = await retryFn(
        () =>
          this.database
            .update(resourceSchema)
            .set({ duplicatedId: null })
            .where(eq(resourceSchema.duplicatedId, id))
            .returning({
              id: resourceSchema.id
            }),
        5
      ).catch(() => undefined);

      // Update duplicated id which createdAt > r.createdAt
      const resp3 = await retryFn(
        () =>
          this.database
            .update(resourceSchema)
            .set({
              duplicatedId: id
            })
            .where(
              and(
                eq(resourceSchema.isDeleted, false),
                isNull(resourceSchema.duplicatedId),
                gt(resourceSchema.createdAt, resource.createdAt),
                or(
                  eq(resourceSchema.title, resource.title),
                  eq(resourceSchema.magnet, resource.magnet)
                )
              )
            )
            .returning({
              id: resourceSchema.id
            }),
        5
      );

      const removed = new Set(resp2?.map((r) => r.id));
      const inserted = new Set(resp3?.map((r) => r.id));

      return {
        updated: resp1[0],
        inserted: [...removed].filter((id) => !inserted.has(id)),
        duplicated: [...inserted].filter((id) => !removed.has(id))
      };
    }

    return { updated: undefined, inserted: [], duplicated: [] };
  }

  public async syncResources(platform: ProviderType, resources: NewResource[]) {
    const visited = new Set(resources.map((r) => r.provider + ':' + r.providerId));

    const minCreatedAt = resources.reduce((acc, cur) => {
      return Math.min(acc, new Date(cur.createdAt!).getTime());
    }, Number.MAX_SAFE_INTEGER);
    const maxCreatedAt = resources.reduce((acc, cur) => {
      return Math.max(acc, new Date(cur.createdAt!).getTime());
    }, Number.MIN_SAFE_INTEGER);
    const stored = await retryFn(
      () =>
        this.database
          .select({
            id: resourceSchema.id,
            title: resourceSchema.title,
            provider: resourceSchema.provider,
            providerId: resourceSchema.providerId
          })
          .from(resourceSchema)
          .where(
            and(
              eq(resourceSchema.provider, platform),
              eq(resourceSchema.isDeleted, false),
              gt(resourceSchema.createdAt, new Date(minCreatedAt)),
              lt(resourceSchema.createdAt, new Date(maxCreatedAt))
            )
          )
          .orderBy(desc(resourceSchema.createdAt)),
      5
    ).catch(() => []);

    const deleted = stored.filter((st) => !visited.has(st.provider + ':' + st.providerId));
    if (deleted.length > 0) {
      this.logger.info('Mark resources as deleted', deleted);

      const resp = await retryFn(
        () =>
          this.database
            .update(resourceSchema)
            .set({ isDeleted: true })
            .where(
              inArray(
                resourceSchema.id,
                deleted.map((st) => st.id)
              )
            )
            .returning({
              id: resourceSchema.id,
              provider: resourceSchema.provider,
              providerId: resourceSchema.providerId,
              title: resourceSchema.title
            }),
        5
      ).catch(() => []);

      // Clearing related duplicate id
      const inserted = await retryFn(
        () =>
          this.database
            .update(resourceSchema)
            .set({ duplicatedId: null })
            .where(
              inArray(
                resourceSchema.duplicatedId,
                deleted.map((st) => st.id)
              )
            )
            .returning({
              id: resourceSchema.id
            }),
        5
      ).catch(() => []);

      return {
        deleted: resp,
        inserted: inserted.map((r) => r.id)
      };
    }

    return {
      deleted: [],
      inserted: []
    };
  }
}
