import { type ConsolaInstance, createConsola } from 'consola';

import type { Database } from '../connect/database';
import type { RedisStorage as Storage } from '../connect/redis';

import { Module } from './module';
import { getSecret } from './secret';

export type { Database, Storage };

export interface SystemOptions {
  secret?: string;

  postgresUri?: string;

  redisUri?: string;
}

export class System<M extends Record<string, Module> = {}> {
  public readonly logger: ConsolaInstance;

  public database!: Database;

  public storage?: Storage;

  public readonly options: SystemOptions;

  public readonly modules: M = {} as M;

  public readonly disposables: Array<(sys: System) => void | Promise<void>> = [];

  public constructor(options: SystemOptions = {}) {
    this.logger = createConsola().withTag('System');
    this.options = options;
  }

  public async initialize() {
    for (const mod of Object.values(this.modules)) {
      await mod.initialize();
    }
    this.logger.success('Initialized OK');
  }

  public async import() {
    for (const mod of Object.values(this.modules)) {
      await mod.import();
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
