import type { ConsolaInstance } from 'consola';

import { and, eq } from 'drizzle-orm';

import { type ProviderType, type ScrapedResourceDetail } from '@animegarden/client';

import type { System } from '../system';
import type { Detail } from '../schema';

import { retryFn } from '../utils';
import { details } from '../schema/details';
import { resources } from '../schema/resources';

import type { DatabaseResource } from './types';

import { RESOURCE_SELECTOR } from './query';

type RedisCache = {
  resource: DatabaseResource;
  detail: Detail;
};

const DETAIL_EXPIRE = 7 * 24 * 60 * 60;

export class DetailsManager {
  private readonly system: System;

  private readonly logger: ConsolaInstance;

  public constructor(system: System) {
    this.system = system;
    this.logger = system.modules.resources.logger.withTag('details');
  }

  public async initialize() {}

  public async getByProviderId(
    provider: ProviderType,
    providerId: string,
    scraper: () => Promise<ScrapedResourceDetail | undefined>
  ) {
    const { query } = this.system.modules.resources;

    // 1. Get from redis
    const cache = await this.getByProviderIdFromRedis(provider, providerId);
    if (cache) {
      return {
        resource: await query.transform(cache.resource),
        detail: cache.detail
      };
    }

    // 2. Get resource from database
    const resp1 = await this.system.database
      .select(RESOURCE_SELECTOR)
      .from(resources)
      .where(and(eq(resources.provider, provider), eq(resources.providerId, providerId)));

    const found = resp1[0];
    if (!found) {
      return {
        resource: undefined,
        detail: undefined
      };
    }
    const resource = await query.transform(found);

    // 3. Get detail from database
    const resp2 = await this.system.database.select().from(details).where(eq(details.id, found.id));
    const detail = resp2[0];
    if (!detail || new Date().getTime() - detail.fetchedAt.getTime() > DETAIL_EXPIRE * 1000) {
      this.logger.info(`Start fetching resource detail of ${provider}:${providerId}`);

      // 4. Fetch detail
      try {
        const scraped = await scraper();

        if (scraped) {
          const detail = await this.insertDetail(found, scraped);

          if (detail) {
            this.logger.success(`Finish fetching resource detail of ${provider}:${providerId}`);

            return {
              resource,
              detail
            };
          }
        }
      } catch (error) {
        this.logger.warn(`Fail fetching resource detail of ${provider}:${providerId}`);
        this.logger.error(error);
      }

      return {
        resource,
        detail: undefined
      };
    } else {
      return {
        resource,
        detail
      };
    }
  }

  public async insertDetail(resource: DatabaseResource, scraped: ScrapedResourceDetail) {
    const detail: Detail = {
      id: resource.id,
      description: scraped.description,
      magnets: scraped.magnets,
      files: scraped.files,
      hasMoreFiles: scraped.hasMoreFiles,
      fetchedAt: new Date()
    };

    const resp = await retryFn(
      () =>
        this.system.database
          .insert(details)
          .values(detail)
          .onConflictDoNothing()
          .returning({ id: details.id }),
      5
    ).catch(() => undefined);
    if (resp) {
      if (resp.length === 0) {
        await retryFn(
          () =>
            this.system.database
              .update(details)
              .set({
                description: detail.description,
                magnets: detail.magnets,
                files: detail.files,
                hasMoreFiles: detail.hasMoreFiles,
                fetchedAt: detail.fetchedAt
              })
              .where(eq(details.id, resource.id))
              .returning({ id: details.id }),
          5
        ).catch(() => undefined);
      }

      await this.updateRedisCache(
        resource.provider as ProviderType,
        resource.providerId,
        { resource, detail },
        DETAIL_EXPIRE
      );

      return detail;
    } else {
      return undefined;
    }
  }

  private async getByProviderIdFromRedis(
    provider: ProviderType,
    providerId: string
  ): Promise<RedisCache | undefined> {
    const { redis } = this.system;
    if (!redis) return undefined;
    try {
      const key = `details:${provider}:${providerId}`;
      const resp = await redis.get(key);
      if (resp) {
        const json = JSON.parse(resp) as RedisCache;
        json.detail.fetchedAt = new Date(json.detail.fetchedAt);
        return json;
      } else {
        return undefined;
      }
    } catch {
      return undefined;
    }
  }

  private async updateRedisCache(
    provider: ProviderType,
    providerId: string,
    cache: RedisCache,
    ttl?: number
  ) {
    const { redis } = this.system;
    if (!redis) return undefined;

    const key = `details:${provider}:${providerId}`;
    try {
      // @ts-ignore
      cache.detail.fetchedAt = cache.detail.fetchedAt.toISOString();
      const value = JSON.stringify(cache);
      if (ttl) {
        return await redis.set(key, value, 'EX', ttl);
      } else {
        return await redis.set(key, value);
      }
    } catch {
      return undefined;
    }
  }
}
