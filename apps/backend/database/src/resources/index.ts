import { and, eq, inArray, sql } from 'drizzle-orm';

import type { System } from '../system';
import type { ProviderType } from '../schema/providers';

import { Module } from '../system/module';
import { resources as resourceSchema } from '../schema/resources';

import type { InsertResourcesOptions, NewResource } from './types';

import { transformNewResources } from './transform';

export * from './types';

export class ResourcesModule extends Module<System['modules']> {
  public static name = 'resources';

  public async initialize() {
    this.system.logger.info('Initializing Resources module');
    this.system.logger.success('Initialize Resources module OK');
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
    const newResources = [];
    const errors = [];
    for (const r of resources) {
      const res = transformNewResources(this.system, r, options);
      if (!res.errors && res.result) {
        map.set(`${r.provider}:${r.providerId}`, res.result);
        newResources.push(res.result);
      } else {
        errors.push(r);
      }
    }

    if (newResources.length === 0) return { inserted: [], conflict: [], errors: [] };

    const resp = await this.database
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
          const duplicatedId = sql`(SELECT ${resourceSchema.id}
FROM ${resourceSchema}
WHERE (${resourceSchema.provider} != ${r.provider}) 
AND (${resourceSchema.isDeleted} = false)
AND (${resourceSchema.duplicatedId} is null)
AND (${resourceSchema.createdAt} < ${r.createdAt})
AND (${resourceSchema.magnet} = ${r.magnet} OR ${resourceSchema.title} = ${r.title})
ORDER BY ${resourceSchema.createdAt} asc
LIMIT 1)`;

          return {
            isDeleted: false,
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
        isDeleted: resourceSchema.isDeleted,
        duplicatedId: resourceSchema.duplicatedId
      });

    const conflict: NonNullable<ReturnType<typeof transformNewResources>['result']>[] = [];
    if (resp.length < newResources.length) {
      for (const r of resp) {
        map.delete(`${r.provider}:${r.providerId}`);
      }
      conflict.push(...map.values());
    }

    return {
      inserted: resp,
      conflict,
      errors
    };
  }
}
