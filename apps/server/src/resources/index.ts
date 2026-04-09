import { and, desc, eq, inArray, lt, gt } from 'drizzle-orm';

import { type ProviderType, SupportProviders } from '@animegarden/client';
import { normalizeBtihToBase32, normalizeBtihToHex } from '@animegarden/shared';

import type { NotifiedResource } from '../system/types';
import type { System, Notification } from '../system';
import type { NewResource as NewDbResource } from '../schema';

import { Module } from '../system/module';
import { resources as resourceSchema } from '../schema/resources';
import { retryDatabaseFn } from '../utils/database';

import type {
  DuplicateMaintenanceResult,
  NewResource,
  SyncDeletedResourcesResult as MarkDeletedResourcesResult,
  UpsertResourcesOptions,
  UpsertResourcesResult
} from './types';

import { QueryManager } from './query';
import { DetailsManager } from './details';
import { buildTitleSearchSql, transformNewResources } from './transform';

export * from './types';

const NOTIFIED_RESOURCE_SELECTOR = {
  id: resourceSchema.id,
  provider: resourceSchema.provider,
  providerId: resourceSchema.providerId,
  title: resourceSchema.title
} as const;

const UPSERT_RESOURCE_SELECTOR = {
  id: resourceSchema.id,
  provider: resourceSchema.provider,
  providerId: resourceSchema.providerId,
  title: resourceSchema.title,
  titleAlt: resourceSchema.titleAlt,
  href: resourceSchema.href,
  magnet: resourceSchema.magnet,
  tracker: resourceSchema.tracker,
  publisherId: resourceSchema.publisherId,
  fansubId: resourceSchema.fansubId,
  subjectId: resourceSchema.subjectId,
  isDeleted: resourceSchema.isDeleted
} as const;

const DUPLICATE_RESOURCE_SELECTOR = {
  id: resourceSchema.id,
  provider: resourceSchema.provider,
  magnet: resourceSchema.magnet,
  createdAt: resourceSchema.createdAt,
  duplicatedId: resourceSchema.duplicatedId,
  isDeleted: resourceSchema.isDeleted
} as const;

type ExistingUpsertResource = {
  id: number;
  provider: ProviderType;
  providerId: string;
  title: string;
  titleAlt: string;
  href: string;
  magnet: string;
  tracker: string;
  publisherId: number;
  fansubId: number | null;
  subjectId: number | null;
  isDeleted: boolean | null;
};

type DuplicateResource = {
  id: number;
  provider: ProviderType;
  magnet: string;
  createdAt: Date;
  duplicatedId: number | null;
  isDeleted: boolean | null;
};

function getResourceKey(resource: { provider: string; providerId: string }) {
  return `${resource.provider}:${resource.providerId}`;
}

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

  public async getResourcesByProviderId(provider: string, ids: string[]) {
    if (ids.length === 0) return [];

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

  private async getExistingResources(resources: NewDbResource[]) {
    const grouped = new Map<ProviderType, string[]>();
    for (const resource of resources) {
      if (!grouped.has(resource.provider)) {
        grouped.set(resource.provider, []);
      }
      grouped.get(resource.provider)!.push(resource.providerId);
    }

    const resp: Map<string, ExistingUpsertResource> = new Map();

    for (const [provider, providerIds] of grouped) {
      if (providerIds.length === 0) continue;

      const rows = await this.database
        .select(UPSERT_RESOURCE_SELECTOR)
        .from(resourceSchema)
        .where(
          and(
            eq(resourceSchema.provider, provider),
            inArray(resourceSchema.providerId, [...new Set(providerIds)])
          )
        );
      for (const row of rows) {
        resp.set(getResourceKey(row), row);
      }
    }

    return resp;
  }

  public async upsertResources(
    resources: NewResource[],
    options: UpsertResourcesOptions = {}
  ): Promise<UpsertResourcesResult> {
    const deduped = [
      ...new Map(resources.map((resource) => [getResourceKey(resource), resource])).values()
    ];
    const errors: NewResource[] = [];

    if (deduped.length === 0) {
      return {
        inserted: [],
        updated: [],
        changed: [],
        errors
      };
    }

    await this.ensureParties(deduped);

    const transformed: NewDbResource[] = [];
    for (const resource of deduped) {
      const result = transformNewResources(this.system, resource, options);
      if (result.result) {
        transformed.push(result.result);
      } else {
        errors.push(resource);
      }
    }

    if (transformed.length === 0) {
      return {
        inserted: [],
        updated: [],
        changed: [],
        errors
      };
    }

    const existing = await this.getExistingResources(transformed);

    const toInsert: NewDbResource[] = [];
    const toUpdate: Array<{
      resource: NewDbResource;
      existed: ExistingUpsertResource;
      set: Partial<typeof resourceSchema.$inferInsert>;
    }> = [];

    for (const resource of transformed) {
      const existed = existing.get(getResourceKey(resource));
      if (!existed) {
        toInsert.push(resource);
        continue;
      }

      {
        let changed = false;
        const set: Partial<typeof resourceSchema.$inferInsert> = {};

        if ((resource.isDeleted ?? false) !== existed.isDeleted) {
          changed = true;
          set.isDeleted = resource.isDeleted ?? false;
        }

        if (resource.href !== existed.href) {
          changed = true;
          set.href = resource.href;
        }

        if (resource.magnet !== existed.magnet) {
          changed = true;
          set.magnet = resource.magnet;
        }

        if (resource.tracker !== existed.tracker) {
          changed = true;
          set.tracker = resource.tracker;
        }

        if (resource.subjectId !== existed.subjectId) {
          changed = true;
          set.subjectId = resource.subjectId;
        }

        if (resource.publisherId !== existed.publisherId) {
          changed = true;
          set.publisherId = resource.publisherId;
        }

        if (resource.fansubId !== existed.fansubId) {
          changed = true;
          set.fansubId = resource.fansubId;
        }

        if (resource.title !== existed.title || resource.titleAlt !== existed.titleAlt) {
          changed = true;
          set.title = resource.title;
          set.titleAlt = resource.titleAlt;
          // @ts-ignore
          set.titleSearch = buildTitleSearchSql(resource);
        }

        if (changed) {
          set.fetchedAt = resource.fetchedAt ?? new Date();
          toUpdate.push({
            resource,
            existed,
            set
          });
        }
      }
    }

    const inserted =
      toInsert.length > 0
        ? await retryDatabaseFn(
            () =>
              this.database
                .insert(resourceSchema)
                .values(
                  toInsert.map((resource) => ({
                    ...resource,
                    titleSearch: buildTitleSearchSql(resource)
                  }))
                )
                .onConflictDoNothing()
                .returning(NOTIFIED_RESOURCE_SELECTOR),
            { count: 5 }
          )
        : [];

    const updated: NotifiedResource[] = [];
    for (const item of toUpdate) {
      const resp = await retryDatabaseFn(
        () =>
          this.database
            .update(resourceSchema)
            .set(item.set)
            .where(
              and(
                eq(resourceSchema.provider, item.resource.provider),
                eq(resourceSchema.providerId, item.resource.providerId)
              )
            )
            .returning(NOTIFIED_RESOURCE_SELECTOR),
        { count: 5 }
      );

      if (resp[0]) {
        updated.push(resp[0]);
      }
    }

    return {
      inserted,
      updated,
      changed: [
        ...inserted.map((resource) => resource.id),
        ...updated.map((resource) => resource.id)
      ],
      errors
    };
  }

  public async markDeletedResources(
    platform: ProviderType,
    resources: NewResource[]
  ): Promise<MarkDeletedResourcesResult> {
    if (resources.length === 0) {
      return {
        deleted: []
      };
    }

    const visited = new Set(resources.map((resource) => getResourceKey(resource)));
    const minCreatedAt = resources.reduce((acc, resource) => {
      return Math.min(acc, resource.createdAt.getTime());
    }, Number.MAX_SAFE_INTEGER);
    const maxCreatedAt = resources.reduce((acc, resource) => {
      return Math.max(acc, resource.createdAt.getTime());
    }, Number.MIN_SAFE_INTEGER);

    const stored = await retryDatabaseFn(
      () =>
        this.database
          .select(NOTIFIED_RESOURCE_SELECTOR)
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
      { count: 5 }
    ).catch(() => []);

    const deleted = stored.filter((resource) => !visited.has(getResourceKey(resource)));
    if (deleted.length === 0) {
      return {
        deleted: []
      };
    }

    this.logger.info('Mark resources as deleted', deleted);

    const deletedIds = deleted.map((resource) => resource.id);
    const resp = await retryDatabaseFn(
      () =>
        this.database
          .update(resourceSchema)
          .set({ isDeleted: true })
          .where(inArray(resourceSchema.id, deletedIds))
          .returning(NOTIFIED_RESOURCE_SELECTOR),
      { count: 5 }
    ).catch(() => []);

    return {
      deleted: resp
    };
  }

  public async updateResource(resource: NewResource, fetchedAt?: Date) {
    const upsert = await this.upsertResources([{ ...resource, fetchedAt }], {
      indexSubject: true
    });

    const duplicated =
      upsert.changed.length > 0
        ? await this.maintainDuplicatedResources(upsert.changed)
        : { attached: [], detached: [] };

    return {
      inserted: upsert.inserted,
      updated: upsert.updated,
      duplicated
    };
  }

  public async maintainDuplicatedResources(changed: number[]): Promise<DuplicateMaintenanceResult> {
    if (changed.length === 0) {
      return {
        attached: [],
        detached: []
      };
    }

    const seeds = await retryDatabaseFn(
      () =>
        this.database
          .select(DUPLICATE_RESOURCE_SELECTOR)
          .from(resourceSchema)
          .where(inArray(resourceSchema.id, changed)),
      { count: 5 }
    );

    // magnet -> 2 magnet variants
    const magnets = new Map<string, string[]>();
    for (const seed of seeds) {
      if (!seed.magnet) continue;
      const variants = [normalizeBtihToHex(seed.magnet), normalizeBtihToBase32(seed.magnet)].filter(
        Boolean
      );
      if (variants.length === 2) {
        magnets.set(variants[0], variants);
      }
    }

    if (magnets.size === 0) {
      return {
        attached: [],
        detached: []
      };
    }

    const attach = new Set<number>();
    const detach = new Set<number>();

    // Mark duplicated_id = null
    const winnerIds = new Set<number>();
    // Mark duplicated_id = key where id in value
    const loserIds = new Map<number, Set<number>>();

    for (const variants of magnets.values()) {
      const candidates = await retryDatabaseFn(
        () =>
          this.database
            .select(DUPLICATE_RESOURCE_SELECTOR)
            .from(resourceSchema)
            .where(
              and(eq(resourceSchema.isDeleted, false), inArray(resourceSchema.magnet, variants))
            ),
        { count: 5 }
      );

      if (candidates.length === 0) {
        continue;
      }

      candidates.sort((lhs: DuplicateResource, rhs: DuplicateResource) => {
        const providerPriority =
          SupportProviders.indexOf(lhs.provider) - SupportProviders.indexOf(rhs.provider);
        if (providerPriority !== 0) return providerPriority;

        const createdAt = lhs.createdAt.getTime() - rhs.createdAt.getTime();
        if (createdAt !== 0) return createdAt;

        return lhs.id - rhs.id;
      });

      const winner = candidates[0];

      for (const resource of candidates) {
        const nextDuplicatedId = resource.id === winner.id ? null : winner.id;
        const currentDuplicatedId = resource.duplicatedId ?? null;
        if (currentDuplicatedId === nextDuplicatedId) continue;

        if (nextDuplicatedId === null) {
          winnerIds.add(resource.id);
          if (currentDuplicatedId !== null) {
            detach.add(resource.id);
          }
        } else {
          if (!loserIds.has(nextDuplicatedId)) {
            loserIds.set(nextDuplicatedId, new Set());
          }
          loserIds.get(nextDuplicatedId)!.add(resource.id);
          if (currentDuplicatedId === null) {
            attach.add(resource.id);
          }
        }
      }
    }

    if (winnerIds.size > 0) {
      await retryDatabaseFn(
        () =>
          this.database
            .update(resourceSchema)
            .set({ duplicatedId: null })
            .where(inArray(resourceSchema.id, [...winnerIds])),
        { count: 5 }
      );
    }

    for (const [duplicatedId, ids] of loserIds) {
      await retryDatabaseFn(
        () =>
          this.database
            .update(resourceSchema)
            .set({ duplicatedId })
            .where(inArray(resourceSchema.id, [...ids])),
        { count: 5 }
      );
    }

    return {
      attached: [...attach],
      detached: [...detach]
    };
  }

  private async ensureParties(resources: NewResource[]) {
    await this.system.modules.users.insertUsers(
      resources
        .map((resource) =>
          resource.publisher && resource.publisher.providerId
            ? {
                provider: resource.provider,
                providerId: resource.publisher.providerId,
                name: resource.publisher.name,
                avatar: resource.publisher.avatar
              }
            : undefined
        )
        .filter(Boolean)
    );
    await this.system.modules.teams.insertTeams(
      resources
        .map((resource) =>
          resource.fansub && resource.fansub.providerId
            ? {
                provider: resource.provider,
                providerId: resource.fansub.providerId,
                name: resource.fansub.name,
                avatar: resource.fansub.avatar
              }
            : undefined
        )
        .filter(Boolean)
    );
  }
}
