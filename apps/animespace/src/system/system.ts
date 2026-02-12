import type { Subject } from '../subject/subject.js';

import { loadCollections } from '../subject/load.js';

import { validateSpace } from './validate.js';
import { type Space, inferRoot, loadSpace } from './space.js';

export class System {
  public space!: Space;

  public subjects: Subject[] = [];

  public constructor() {}

  public async loadSpace() {
    this.space = await loadSpace(inferRoot());
    return this.space;
  }

  public async loadSubjects() {
    if (!this.space) {
      throw new Error('Space is not loaded.');
    }
    const collections = await loadCollections(this, this.space.collections);
    this.subjects = collections.flatMap((collection) => collection.subjects);
    return this.subjects;
  }

  public async validate() {
    if (!this.space) {
      throw new Error('Space is not loaded.');
    }
    await validateSpace(this.space, this.subjects);
  }
}

export async function makeSystem() {
  const system = new System();
  await system.loadSpace();
  return system;
}
