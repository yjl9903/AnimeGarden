import type { System } from './system';

export abstract class Module<M extends Record<string, Module> = {}> {
  public static readonly name: string;

  public readonly system: System<M>;

  public constructor(system: System<M>) {
    this.system = system;
  }

  public async initialize(): Promise<void> {}
}
