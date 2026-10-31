import { eq } from 'drizzle-orm';

import type { ProviderType } from '@animegarden/client';

import type { System } from '../system/index.ts';

import { Module } from '../system/module.ts';
import { providers } from '../schema/providers.ts';
import { retryDatabaseFn } from '../utils/database.ts';

export class ProvidersModule extends Module<System['modules']> {
  public static name = 'providers';

  public readonly providers: Map<ProviderType, typeof providers.$inferSelect> = new Map();

  private fetching: Promise<void> | undefined;

  public async initialize() {
    this.logger.info('Initializing Providers module');
    await this.fetchProviders();

    // Notifications are best-effort; reload the small provider snapshot even without Redis.
    const timer = setInterval(() => {
      if (!this.fetching) {
        void this.fetchProviders().catch((error) => this.logger.error(error));
      }
    }, 60_000);
    timer.unref();
    this.system.disposables.push(() => clearInterval(timer));

    this.logger.success('Initialize Providers module OK');
  }

  public async refresh() {
    this.logger.info('Refreshing Providers module');
    await this.fetchProviders();
    this.logger.success('Refresh Providers module OK');
  }

  /** Serializes reloads and replaces the snapshot only after a complete database read succeeds. */
  public async fetchProviders() {
    // A notification arriving during a poll must read after it, not race an older snapshot.
    while (this.fetching) await this.fetching.catch(() => undefined);

    const fetching = (async () => {
      const resp = await retryDatabaseFn(() => this.database.select().from(providers), {
        count: 5
      });
      this.providers.clear();
      for (const p of resp) {
        this.providers.set(p.id, p);
      }
    })();
    this.fetching = fetching;
    try {
      await fetching;
      return this.providers;
    } finally {
      this.fetching = undefined;
    }
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

      const resp = await retryDatabaseFn(
        () =>
          this.database
            .update(providers)
            .set({ isActive: true, refreshedAt: timestamp })
            .where(eq(providers.id, provider))
            .returning(),
        { count: 5 }
      );

      void this.fetchProviders().catch((error) => this.logger.error(error));

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

      const resp = await retryDatabaseFn(
        () =>
          this.database
            .update(providers)
            .set({ isActive })
            .where(eq(providers.id, provider))
            .returning(),
        { count: 5 }
      );

      void this.fetchProviders().catch((error) => this.logger.error(error));

      return resp[0];
    } catch (error) {
      this.logger.error(error);
      return undefined;
    }
  }
}
