import { and, desc, eq, gt, inArray, isNull, lt, or, sql } from 'drizzle-orm';

import type { ProviderType } from '@animegarden/client';

import type { System, Notification } from '../system';
import type { NewResource as NewDbResource } from '../schema';

import { retryFn } from '../utils';
import { Module } from '../system/module';
import { resources as resourceSchema } from '../schema/resources';

import type { InsertResourcesOptions, NewResource } from './types';

import { QueryManager } from './query';
import { DetailsManager } from './details';
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
    await this.query.onNotifications(notification.resources.inserted);
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

    if (newResources.length === 0) return { inserted: [], conflict: [], errors: [] };

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
        await retryFn(
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
              ),
          5
        );
      }
    }

    if (options.keepshare) {
      // TODO: prefetch keepshare
    }

    return {
      inserted: resp,
      conflict,
      errors
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
            eq(resourceSchema.providerId, updated.providerId),
            eq(resourceSchema.isDeleted, false)
          )
        }),
      5
    ).catch(() => undefined);
    if (!dbRes) {
      const { inserted } = await this.insertResources([{ ...resource, fetchedAt }], {
        indexSubject: true,
        updateDuplicatedId: true
      });
      return { updated: inserted[0] };
    }

    let changed = false;
    const set: Partial<typeof resourceSchema.$inferInsert> = {};

    if (updated.href !== dbRes.href) {
      set.href = updated.href;
    }

    if (updated.magnet !== dbRes.magnet) {
      set.magnet = updated.magnet;
    }

    if (updated.tracker !== dbRes.tracker) {
      set.tracker = updated.tracker;
    }

    if (updated.subjectId !== dbRes.subjectId) {
      set.subjectId = updated.subjectId;
    }

    if (updated.title !== dbRes?.title) {
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

      // @ts-ignore
      set.duplicatedId = sql`(SELECT ${resourceSchema.id}
FROM ${resourceSchema}
WHERE (${eq(resourceSchema.isDeleted, false)})
AND (${isNull(resourceSchema.duplicatedId)})
AND (${lt(resourceSchema.createdAt, updated.createdAt!)})
AND (${eq(resourceSchema.title, updated.title)} OR ${eq(resourceSchema.magnet, updated.magnet)})
ORDER BY ${resourceSchema.createdAt} asc
LIMIT 1)`;

      changed = true;
    }

    // Do update
    if (changed) {
      set.fetchedAt = fetchedAt ?? new Date();

      const resp = await retryFn(
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
      if (resp && resp.length === 1) {
        return { updated: resp[0] };
      }
    }
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

      return {
        deleted: resp
      };
    }

    return {
      deleted: []
    };
  }
}
