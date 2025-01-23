import { type Redis as RedisStorage } from 'ioredis';
import { type ConsolaInstance, createConsola } from 'consola';

import type { Database } from '../connect/database';

import { Module } from './module';
import { getSecret } from './secret';

export type { Database, RedisStorage };

export interface SystemOptions {
  secret?: string;

  postgresUri?: string;

  redisUri?: string;
}

export class System<M extends Record<string, Module> = {}> {
  public readonly logger: ConsolaInstance;

  public database!: Database;

  public redis?: RedisStorage;

  public readonly options: SystemOptions;

  public readonly modules: M = {} as M;

  public readonly disposables: Array<(sys: System) => void | Promise<void>> = [];

  public constructor(options: SystemOptions = {}) {
    this.logger = createConsola().withTag('System');
    this.options = options;
  }

  public async initialize() {
    try {
      for (const mod of Object.values(this.modules)) {
        await mod.initialize();
      }
      this.logger.success('Initialized OK');
    } catch (error) {
      this.logger.error(error);
      process.exit(1);
    }
  }

  public async import() {
    try {
      for (const mod of Object.values(this.modules)) {
        await mod.import();
      }
    } catch (error) {
      this.logger.error(error);
      process.exit(1);
    }
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
