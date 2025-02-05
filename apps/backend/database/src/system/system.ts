import { type Redis as RedisStorage } from 'ioredis';
import { type ConsolaInstance, createConsola } from 'consola';

import type { Database } from '../connect/database';

import type { Notification } from './types';

import { Module } from './module';
import { getSecret } from './secret';

export type { Database, RedisStorage };

export interface SystemOptions {
  secret?: string;

  postgresUri?: string;

  redisUri?: string;

  cron?: boolean;
}

export class System<M extends Record<string, Module> = {}> {
  public readonly logger: ConsolaInstance;

  public database!: Database;

  public redis?: RedisStorage;

  public readonly options: SystemOptions;

  public readonly modules: M = {} as M;

  public readonly disposables: Array<(sys: System) => void | Promise<void>> = [];

  private initializing: Promise<void> | undefined = undefined;

  private refreshing: Promise<void> | undefined = undefined;

  public constructor(options: SystemOptions = {}) {
    const cron = options.cron ?? false;
    this.logger = createConsola().withTag(!cron ? 'system' : 'worker');
    this.options = options;
  }

  public async initialize() {
    if (this.initializing) {
      await this.initializing;
      return;
    }

    this.initializing = new Promise(async (res) => {
      try {
        for (const mod of Object.values(this.modules)) {
          await mod.initialize();
        }
        this.logger.success('Initialized OK');
        res();
      } catch (error) {
        this.logger.error(error);
        process.exit(1);
      }
    });
    await this.initializing;
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
        await fn(this);
      } catch (error) {
        console.log(error);
      }
    }
  }
}
