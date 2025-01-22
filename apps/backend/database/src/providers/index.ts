import { eq } from 'drizzle-orm';

import type { System } from '../system/system';

import { Module } from '../system/module';
import { retryFn } from '../utils';
import { providers, ProviderType } from '../schema/providers';

export class ProvidersModule extends Module<System['modules']> {
  public static name = 'providers';

  public readonly providers: Map<ProviderType, typeof providers.$inferSelect> = new Map();

  public async initialize() {
    this.system.logger.info('Initializing Providers module');
    await this.fetchProviders();
    this.system.logger.success('Initialize Providers module OK');
  }

  public async fetchProviders() {
    const resp = await retryFn(() => this.database.select().from(providers), 5);
    this.providers.clear();
    for (const p of resp) {
      this.providers.set(p.id, p);
    }
    return this.providers;
  }

  public async updateRefreshTimestamp(provider: ProviderType, timestamp: Date) {
    const resp = await retryFn(
      () =>
        this.database
          .update(providers)
          .set({ refreshedAt: timestamp })
          .where(eq(providers.id, provider))
          .returning(),
      5
    );
    return resp[0];
  }

  public async notifyRefreshedResources() {}
}
