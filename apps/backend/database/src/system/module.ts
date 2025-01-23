import type { ConsolaInstance } from 'consola';

import type { System } from './system';

export abstract class Module<M extends Record<string, Module> = {}> {
  public readonly system: System<M>;

  public readonly name: string;

  public readonly logger: ConsolaInstance;

  public constructor(system: System<M>, name: string) {
    this.system = system;
    this.name = name;
    this.logger = this.system.logger.create({}).withTag(name);
  }

  public get database() {
    return this.system.database;
  }

  public get redis() {
    return this.system.redis;
  }

  /**
   * Initializing module with necessary data
   */
  public async initialize(): Promise<void> {}

  /**
   * Importing data after initializing
   */
  public async import(): Promise<void> {}
}
