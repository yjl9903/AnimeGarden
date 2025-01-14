import { sql } from 'drizzle-orm';

import type { System } from '../system';

import { Module } from '../system/module';
import { resources as resourceSchema } from '../schema/resources';

import type { NewResource } from './types';
import { transformNewResources } from './utils';

export * from './types';

export class ResourcesModule extends Module<System['modules']> {
  public static name = 'resources';

  public async initialize() {
    this.system.logger.info('Initializing Resources module');
    this.system.logger.success('Initialize Resources module OK');
  }

  public async insertResources(resources: NewResource[]) {
    const map = new Map<string, NonNullable<ReturnType<typeof transformNewResources>['result']>>();
    const newResources = [];
    const errors = [];
    for (const r of resources) {
      const res = transformNewResources(this.system, r);
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
          const search2 = r.titleSearch[1] ? r.titleSearch[1].join(' ') : undefined;

          const titleSearch =
            search1 && search2
              ? sql`(setweight(to_tsvector('simple', ${search1}), 'A') || setweight(to_tsvector('simple', ${search2}), 'D'))`
              : search1
                ? sql`setweight(to_tsvector('simple', ${search1}), 'A')`
                : sql`setweight(to_tsvector('simple', ${search2 ?? ''}), 'D')`;
          const duplicatedId = sql`(SELECT ${resourceSchema.id} FROM ${resourceSchema} WHERE (${r.provider} != ${resourceSchema.provider}) AND (${r.magnet} = ${resourceSchema.magnet} OR ${r.title} = ${resourceSchema.title}))`;

          return {
            ...r,
            titleSearch,
            duplicatedId,
            isDeleted: false
          };
        })
      )
      .onConflictDoNothing()
      .returning({
        id: resourceSchema.id,
        provider: resourceSchema.provider,
        providerId: resourceSchema.providerId,
        title: resourceSchema.title
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
