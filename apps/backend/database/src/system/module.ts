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

  public async initialize(): Promise<void> {}
}
