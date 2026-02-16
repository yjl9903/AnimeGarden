import createDebug from 'debug';
import { chat } from 'breadc';

import type { Subject } from '../subject/subject.ts';
import type { Database } from '../sqlite/types.ts';

import { loop } from '../utils/loop.ts';
import { memoAsync } from '../utils/result.ts';
import { openDatabase } from '../sqlite/connect.ts';
import { loadCollections } from '../subject/load.ts';
import { AnimeGardenSourceManager } from '../subject/animegarden/manager.ts';
import { refreshSubjects, introspectSubjects } from '../command/refresh.ts';

import { type Space, inferRoot, loadSpace } from './space.ts';
import { validate, validateStorage, validateSubjects } from './validate.ts';

export const logger = chat({ stream: process.stdout });

export interface GetSubjectsOptions {
  enabled?: boolean;
}

export interface GetSubjectOptions {
  name?: string;

  bgm?: string;
}

export interface RefreshOptions {
  force?: boolean;
}

export class System {
  public readonly logger = logger;

  public readonly debug: ReturnType<typeof createDebug> = createDebug('animespace:system');

  private readonly disposables: Array<() => void> = [];

  public space!: Space;

  public readonly subjects: Subject[] = [];

  public readonly managers: {
    animegarden: AnimeGardenSourceManager;
  } = {} as any;

  public database!: Database;

  private validated = false;

  public constructor() {}

  public async loadSpace(root?: string) {
    this.debug('start loading space');
    this.space = await loadSpace(root ?? inferRoot());
    this.managers.animegarden = new AnimeGardenSourceManager(this);
    this.debug('finish loading space ok', this.space);
    return this.space;
  }

  public async reloadSpace(root?: string) {
    if (!this.space) return this.loadSpace(root);

    this.debug('start re-loading space');

    this.space = await loadSpace(root ?? this.space.root.path);
    this.validated = false;
    this.subjects.length = 0;

    this.debug('finish re-loading space ok', this.space);

    return this.space;
  }

  public async loadSubjects() {
    if (!this.space) {
      throw new Error('Space is not loaded.');
    }

    this.debug('start loading subjects');

    const collections = await loadCollections(this, this.space.collections);
    this.subjects.splice(
      0,
      this.subjects.length,
      ...collections.flatMap((collection) => collection.subjects)
    );

    this.debug('finish loading subjects ok');

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

    if (this.validated) return;

    this.debug('start validating system');

    await validate(this);
    this.validated = true;

    this.debug('finish validating system ok');
  }

  public async validateStorage() {
    if (!this.space) {
      throw new Error('Space is not loaded.');
    }

    this.debug('start validating storage');

    await validateStorage(this);

    this.debug('finish validating storage ok');
  }

  public close() {
    for (const fn of this.disposables) {
      try {
        fn();
      } catch {}
    }
    this.disposables.length = 0;

    this.debug('close system');
  }

  /**
   *
   */
  public getSubjects(filter: GetSubjectsOptions = {}) {
    return this.subjects.filter((subject) => {
      return filter.enabled === false ? true : subject.enabled;
    });
  }

  /**
   *
   */
  public getSubject(filter: GetSubjectOptions = {}) {
    if (filter.name) {
      const filterName = filter.name;
      return this.subjects.find((subject) => {
        return subject.name.includes(filterName);
      });
    }

    return undefined;
  }

  /**
   *
   */
  public async watchSubjects(options: GetSubjectsOptions & RefreshOptions) {
    await this.loadSubjects();
    await this.validate();

    // TODO: start download, storage queue

    for await (const turn of loop(10 * 60 * 1000)) {
      if (turn > 0) {
        await this.reloadSpace();
        await this.loadSubjects();
        await validateSubjects(this);
        this.validated = true;
      }

      const subjects = this.getSubjects(options);
      try {
        await refreshSubjects(this, subjects);
      } catch (error) {
        this.logger.error(error);
      }
    }
  }

  /**
   *
   */
  public async refreshSubjects(subjects: Subject[]) {
    await this.validate();

    // TODO: start download, storage queue

    return await refreshSubjects(this, subjects);
  }

  /**
   *
   */
  public async introspectSubjects(subjects: Subject[]) {
    await this.validate();

    return await introspectSubjects(this, subjects);
  }
}

export async function makeSystem(root?: string) {
  const system = new System();
  await system.loadSpace(root);
  return system;
}
