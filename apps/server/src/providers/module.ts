import { eq } from 'drizzle-orm';

import type { ProviderType } from '@animegarden/client';

import { retryFn } from '@animegarden/shared';

import type { System } from '../system';

import { Module } from '../system/module';
import { providers } from '../schema/providers';

export class ProvidersModule extends Module<System['modules']> {
  public static name = 'providers';

  public readonly providers: Map<ProviderType, typeof providers.$inferSelect> = new Map();

  public async initialize() {
    this.logger.info('Initializing Providers module');
    await this.fetchProviders();
    this.logger.success('Initialize Providers module OK');
  }

  public async refresh() {
    this.logger.info('Refreshing Providers module');
    await this.fetchProviders();
    this.logger.success('Refresh Providers module OK');
  }

  public async fetchProviders() {
    const resp = await retryFn(() => this.database.select().from(providers), 5);
    this.providers.clear();
    for (const p of resp) {
      this.providers.set(p.id, p);
    }
    return this.providers;
  }

  public get timestamp() {
    const now = [...this.providers.values()].reduce(
      (acc, c) => Math.max(acc, c.refreshedAt.getTime()),
      0
    );
    return new Date(now);
  }

  public async updateRefreshTimestamp(provider: ProviderType, timestamp: Date) {
    try {
      const info = this.providers.get(provider);
      if (info) {
        info.isActive = true;
        info.refreshedAt = timestamp;
      }

      const resp = await retryFn(
        () =>
          this.database
            .update(providers)
            .set({ isActive: true, refreshedAt: timestamp })
            .where(eq(providers.id, provider))
            .returning(),
        5
      );

      this.fetchProviders();

      return resp[0];
    } catch (error) {
      this.logger.error(error);
      return undefined;
    }
  }

  public async updateActiveStatus(provider: ProviderType, isActive: boolean) {
    try {
      const info = this.providers.get(provider);
      if (info) {
        info.isActive = isActive;
      }

      const resp = await retryFn(
        () =>
          this.database
            .update(providers)
            .set({ isActive })
            .where(eq(providers.id, provider))
            .returning(),
        5
      );

      this.fetchProviders();

      return resp[0];
    } catch (error) {
      this.logger.error(error);
      return undefined;
    }
  }
}
