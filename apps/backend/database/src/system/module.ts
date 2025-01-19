import type { System } from './system';

export abstract class Module<M extends Record<string, Module> = {}> {
  public static readonly name: string;

  public readonly system: System<M>;

  public constructor(system: System<M>) {
    this.system = system;
  }

  public get logger() {
    return this.system.logger;
  }

  public get database() {
    return this.system.database;
  }

  public get storage() {
    return this.system.storage;
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
