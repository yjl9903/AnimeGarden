import { eq } from 'drizzle-orm';

import type { ProviderType } from '@animegarden/client';

import type { System, Notification, NotifiedResources } from '../system';

import { retryFn } from '../utils';
import { Module } from '../system/module';
import { providers } from '../schema/providers';

import { makeChannelMessageBus, subscribeRedisChannel } from '../connect/redis';

const NOTIFY_CHANNEL = `notify-resources`;

export class ProvidersModule extends Module<System['modules']> {
  public static name = 'providers';

  public readonly providers: Map<ProviderType, typeof providers.$inferSelect> = new Map();

  private notifyTimeout: NodeJS.Timeout | undefined;

  public async initialize() {
    this.logger.info('Initializing Providers module');
    await this.fetchProviders();
    // Only server processes subscribe notification event
    if (!this.system.options.cron) {
      await this.registerNotification();
    }
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

      const subs = subscribeRedisChannel(redis, NOTIFY_CHANNEL);
      const bus = makeChannelMessageBus(redis);
      bus.addListener<Notification>(NOTIFY_CHANNEL, async (msg) => {
        await this.onNotification(msg);
      });
      await subs;
    }
  }

  public async onNotification(notification: Notification) {
    this.logger.info(
      `Recive update notification message: ${notification.resources.inserted.length} new resources`
    );

    await this.system.refresh(notification);
  }

  public async notifyRefreshedResources(notification: Notification) {
    if (this.system.options.cron) {
      if (this.system.redis) {
        const { redis } = this.system;

        if (this.notifyTimeout) {
          clearTimeout(this.notifyTimeout);
        }

        this.notifyTimeout = setTimeout(async () => {
          this.logger.info(
            `Publish notification to channel ${NOTIFY_CHANNEL}: ${notification.resources.inserted} new resources, ${notification.resources.deleted} deleted resources, ${notification.duplicated.inserted} unique resources, ${notification.duplicated.duplicated} duplicated resources`
          );
          try {
            await redis.publish(NOTIFY_CHANNEL, JSON.stringify(notification));
          } catch (error) {
            this.logger.error(error);
          } finally {
            this.notifyTimeout = undefined;
          }
        }, 10 * 1000);
      }
    } else {
      await this.onNotification(notification);
    }
  }
}
