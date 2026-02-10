import { type Space, loadSpace, validateSpace } from './space.js';

export class System {
  public space!: Space;

  public constructor() {}

  public async init() {
    this.space = await loadSpace();
    await validateSpace(this.space);
  }
}

export async function makeSystem() {
  const system = new System();
  await system.init();
  return system;
}
