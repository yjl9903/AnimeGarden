import { type Redis as RedisStorage } from 'ioredis';
import { type ConsolaInstance, createConsola } from 'consola';

import type { Database } from '../connect/database';

import { makeChannelMessageBus, subscribeRedisChannel } from '../connect/redis';
import { NOTIFY_CHANNEL, RPC_INVOKE_CHANNEL, RPC_REPLY_CHANNEL } from '../constants';

import type { Notification } from './types';

import { Module } from './module';
import { getSecret } from './secret';
import { type RpcEventMap, type RpcPayload, type RpcSender, type RpcBus, makeRpcBus } from './rpc';

export type { Database, RedisStorage };

export interface SystemOptions {
  secret?: string;

  postgresUri?: string;

  redisUri?: string;

  cron?: boolean;

  site?: string;
}

export class System<M extends Record<string, Module> = {}, E extends RpcEventMap = {}> {
  public readonly logger: ConsolaInstance;

  public database!: Database;

  public redis?: RedisStorage;

  public readonly options: SystemOptions;

  public readonly modules: M = {} as M;

  public readonly rpc: RpcBus<E>;

  public readonly disposables: Array<() => void | Promise<void>> = [];

  private channelMessageBus: ReturnType<typeof makeChannelMessageBus>;

  private rpcSender: RpcSender;

  private initializing: Promise<void> | undefined = undefined;

  private refreshing: Promise<void> | undefined = undefined;

  public constructor(options: SystemOptions = {}) {
    const cron = options.cron ?? false;
    this.logger = createConsola().withTag(!cron ? 'system' : 'worker');
    this.options = options;
    this.channelMessageBus = makeChannelMessageBus();

    const bus = makeRpcBus<E>();
    this.rpc = bus.rpc;
    this.rpcSender = bus.sender;
  }

  public async initialize() {
    if (this.initializing) {
      await this.initializing;
      return;
    }

    this.initializing = new Promise(async (res) => {
      try {
        // Init modules
        for (const mod of Object.values(this.modules)) {
          await mod.initialize();
        }
        // Connect to redis
        await this.initializeRedis();

        this.logger.success('Initialized OK');
        res();
      } catch (error) {
        this.logger.error(error);
        process.exit(1);
      }
    });

    await this.initializing;
  }

  private async initializeRedis() {
    if (!this.redis) return;

    this.rpcSender.send = this.options.cron
      ? async (event) => {
          const { type, gid, payload } = event;
          this.rpc.run(type, payload).then((resp) => {
            this.rpcSender.reply({ type, gid, payload: resp });
          });
          return true;
        }
      : async (payload) => {
          await redis.publish(RPC_INVOKE_CHANNEL, JSON.stringify(payload));
          return true;
        };

    const { redis } = this;
    this.channelMessageBus.listen(redis);

    if (this.options.cron) {
      // Handle rpc invoke
      const sub = subscribeRedisChannel(redis, RPC_INVOKE_CHANNEL);

      this.channelMessageBus.addListener<RpcPayload>(RPC_INVOKE_CHANNEL, async (notification) => {
        this.channelMessageBus.logger.info(`Recive rpc invoke: ${notification}`);

        const { type, gid, payload } = notification;
        const resp = await this.rpc.run(type, payload);
        await redis.publish(
          RPC_REPLY_CHANNEL,
          JSON.stringify({
            type,
            gid,
            payload: resp
          })
        );
      });

      await sub;
    } else {
      // Only server processes subscribe notification event
      const subs = [
        subscribeRedisChannel(redis, NOTIFY_CHANNEL),
        subscribeRedisChannel(redis, RPC_REPLY_CHANNEL)
      ];

      this.channelMessageBus.addListener<Notification>(NOTIFY_CHANNEL, async (notification) => {
        await this.onNotification(notification);
      });

      this.channelMessageBus.addListener<RpcPayload>(RPC_REPLY_CHANNEL, async (notification) => {
        this.channelMessageBus.logger.info(`Recive rpc reply: ${notification}`);

        this.rpcSender.reply(notification);
      });

      await Promise.all(subs);
    }
  }

  private async onNotification(notification: Notification) {
    this.channelMessageBus.logger.info(
      `Recive update notification message: ${notification.resources.inserted.length} new resources`
    );

    await this.refresh(notification);
  }

  public async notifyRefreshedResources(notification: Notification) {
    if (this.options.cron) {
      if (!this.redis) return;

      const { redis } = this;

      this.channelMessageBus.logger.info(
        `Publish notification to channel ${NOTIFY_CHANNEL}: ${notification.resources.inserted} new resources, ${notification.resources.deleted} deleted resources, ${notification.duplicated.inserted} unique resources, ${notification.duplicated.duplicated} duplicated resources`
      );
      try {
        await redis.publish(NOTIFY_CHANNEL, JSON.stringify(notification));
      } catch (error) {
        this.channelMessageBus.logger.error(`Publish to ${NOTIFY_CHANNEL} failed`, error);
      }
    } else {
      await this.onNotification(notification);
    }
  }

  public async import() {
    try {
      for (const mod of Object.values(this.modules)) {
        await mod.import();
      }
      this.logger.success('Import OK');
    } catch (error) {
      this.logger.error(error);
      process.exit(1);
    }
  }

  public async refresh(notification: Notification) {
    while (this.refreshing) {
      await this.refreshing;
    }
    const refreshing = new Promise<void>(async (res) => {
      this.logger.info('Start refreshing modules');
      for (const mod of Object.values(this.modules)) {
        try {
          await mod.refresh(notification);
        } catch (error) {
          this.logger.error(error);
        }
      }
      this.logger.success('Refreshed modules OK');
      this.refreshing = undefined;
      res();
    });
    this.refreshing = refreshing;
    await refreshing;
  }

  public get secret() {
    return getSecret();
  }

  public async close() {
    for (const fn of this.disposables) {
      try {
        await fn();
      } catch (error) {
        console.log(error);
      }
    }
  }
}
