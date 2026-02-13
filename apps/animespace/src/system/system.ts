import { chat } from 'breadc';

import type { Subject } from '../subject/subject.ts';
import type { Database } from '../sqlite/types.ts';

import { memoAsync } from '../utils/result.ts';
import { openDatabase } from '../sqlite/connect.ts';
import { loadCollections } from '../subject/load.ts';
import { AnimeGardenSourceManager } from '../subject/animegarden.ts';

import { validate, validateStorage } from './validate.ts';
import { type Space, inferRoot, loadSpace } from './space.ts';

export const logger = chat();

export class System {
  public readonly logger = logger;

  private readonly disposables: Array<() => void> = [];

  public space!: Space;

  public subjects: Subject[] = [];

  public animegardenSourceManager!: AnimeGardenSourceManager;

  public database!: Database;

  public constructor() {}

  public async loadSpace() {
    this.space = await loadSpace(inferRoot());
    this.animegardenSourceManager = new AnimeGardenSourceManager(this);
    return this.space;
  }

  public async reloadSpace() {
    if (!this.space) return this.loadSpace();
    this.space = await loadSpace(this.space.root.path);
    this.subjects.length = 0;
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

  public openDatabase = memoAsync(async () => {
    if (!this.space) {
      throw new Error('Space is not loaded.');
    }
    const { client, database } = await openDatabase(this.space);
    this.database = database;
    this.disposables.push(() => {
      client.close();
    });
    return database;
  });

  public async validate() {
    if (!this.space) {
      throw new Error('Space is not loaded.');
    }
    await validate(this.space, this.subjects);
  }

  public async validateStorage() {
    if (!this.space) {
      throw new Error('Space is not loaded.');
    }
    await validateStorage(this.space);
  }

  public close() {
    for (const fn of this.disposables) {
      try {
        fn();
      } catch {}
    }
    this.disposables.length = 0;
  }
}

export async function makeSystem() {
  const system = new System();
  await system.loadSpace();
  return system;
}
