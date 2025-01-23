import { eq } from 'drizzle-orm';

import type { System } from '../system';

import { retryFn } from '../utils';
import { Module } from '../system/module';
import { providers, ProviderType } from '../schema/providers';

import type { NotifiedResources } from './types';

const NOTIFY_CHANNEL = `notify-resources`;

export class ProvidersModule extends Module<System['modules']> {
  public static name = 'providers';

  public readonly providers: Map<ProviderType, typeof providers.$inferSelect> = new Map();

  public async initialize() {
    this.system.logger.info('Initializing Providers module');
    await this.fetchProviders();
    await this.registerNotification();
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
    try {
      const resp = await retryFn(
        () =>
          this.database
            .update(providers)
            .set({ isActive: true, refreshedAt: timestamp })
            .where(eq(providers.id, provider))
            .returning(),
        5
      );

      const info = this.providers.get(provider);
      if (info) {
        info.isActive = true;
        info.refreshedAt = timestamp;
      }

      return resp[0];
    } catch (error) {
      this.logger.error(error);
      return undefined;
    }
  }

  public async updateActiveStatus(provider: ProviderType, isActive: boolean) {
    try {
      const resp = await retryFn(
        () =>
          this.database
            .update(providers)
            .set({ isActive })
            .where(eq(providers.id, provider))
            .returning(),
        5
      );

      const info = this.providers.get(provider);
      if (info) {
        info.isActive = isActive;
      }

      return resp[0];
    } catch (error) {
      this.logger.error(error);
      return undefined;
    }
  }

  public async registerNotification() {
    if (this.system.redis) {
      const { redis } = this.system;

      await new Promise<void>((res, rej) => {
        redis.subscribe(NOTIFY_CHANNEL, (err) => {
          if (err) {
            this.logger.error(`Failed to subscribe ${NOTIFY_CHANNEL}: ${err.message}`);
            rej();
          } else {
            this.logger.success(`Subscribe to ${NOTIFY_CHANNEL} OK`);
            res();
          }
        });

        redis.on('message', async (channel, message) => {
          if (channel === NOTIFY_CHANNEL) {
            try {
              const msg: { resources: NotifiedResources[] } = JSON.parse(message);
              await this.onNotification(msg.resources);
            } catch (error) {
              this.logger.error(error);
            }
          } else {
            this.logger.warn(`Receive message from ${channel}`);
            this.logger.warn(message);
          }
        });
      });
    }
  }

  public async onNotification(resources: NotifiedResources[]) {
    this.logger.info(`Recive update notification message: ${resources.length} new resources`);

    await Promise.all([
      this.initialize(),
      this.system.modules.users.initialize(),
      this.system.modules.teams.initialize(),
      this.system.modules.tags.initialize(),
      this.system.modules.subjects.initialize()
    ]);
  }

  public async notifyRefreshedResources(resources: NotifiedResources[]) {
    if (this.system.redis) {
      const { redis } = this.system;
      this.logger.info(`Publish ${resources.length} new resources to channel ${NOTIFY_CHANNEL}`);
      await redis.publish(NOTIFY_CHANNEL, JSON.stringify({ resources }));
    }
  }
}
