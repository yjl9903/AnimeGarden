import createDebug from 'debug';
import { chat, dim, lightBlue, lightGreen, lightRed } from 'breadc';

import type { Subject } from '../subject/subject.ts';
import type { Database } from '../sqlite/types.ts';

import { loop } from '../utils/loop.ts';
import { memoAsync } from '../utils/result.ts';
import { openDatabase } from '../sqlite/open.ts';
import { loadCollections } from '../subject/load.ts';
import { AnimeGardenSourceManager } from '../subject/animegarden/manager.ts';
import { StorageManager } from '../subject/storage.ts';
import { DownloaderManager } from '../download/manager.ts';
import { printSpace } from '../command/space.ts';
import { pushSubjects, pullSubjects } from '../command/refresh.ts';

import { type Space, inferRoot, loadSpace } from './space.ts';
import { validate, validateStorage, validateSubjects } from './validate.ts';

export const logger = chat({ stream: process.stdout });

export interface GetSubjectsOptions {
  enabled?: boolean;

  name?: string;

  bgm?: string;
}

export interface PushOptions {
  force?: boolean;
}

export interface PullOptions {
  checksum?: boolean;
}

export class System {
  public readonly logger = logger;

  public readonly debug: ReturnType<typeof createDebug> = createDebug('animespace:system');

  private readonly disposables: Array<() => void> = [];

  public space!: Space;

  public readonly subjects: Subject[] = [];

  public readonly managers: {
    animegarden: AnimeGardenSourceManager;
    downloader: DownloaderManager;
    storage: StorageManager;
  } = {} as any;

  public database!: Database;

  private validated = false;

  public constructor() {}

  public async loadSpace(root?: string) {
    this.debug('start loading space');

    this.space = await loadSpace(root ?? inferRoot());
    this.managers.animegarden = new AnimeGardenSourceManager(this);
    this.managers.downloader = new DownloaderManager(this);
    this.managers.storage = new StorageManager(this);

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

  public close() {
    try {
      this.openDatabase.clear();
    } catch {}

    try {
      this.openDownloaderManager.clear();
    } catch {}

    try {
      this.managers.downloader?.close();
    } catch {}

    try {
      this.managers.storage?.close();
    } catch {}

    try {
      this.managers.animegarden?.close();
    } catch {}

    for (const fn of this.disposables) {
      try {
        fn();
      } catch {}
    }
    this.disposables.length = 0;

    this.debug('close system');
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

  public openDownloaderManager = memoAsync(async () => {
    if (!this.space) {
      throw new Error('Space is not loaded.');
    }

    this.logger.log(dim(`连接 ${this.space.downloader.provider} 下载器`));
    const manager = this.managers.downloader;
    await manager.initialize();
    this.logger.log(dim(`连接 ${this.space.downloader.provider} 下载器成功`));

    return manager;
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

  /**
   *
   */
  public getSubjects(filter: GetSubjectsOptions = {}) {
    return this.subjects.filter((subject) => {
      if (filter.enabled !== false) {
        if (!subject.enabled) {
          return false;
        }
      }
      if (filter.name) {
        if (!subject.name.includes(filter.name)) {
          return false;
        }
      }
      if (filter.bgm && subject.bgm) {
        if (subject.bgm !== +filter.bgm) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   *
   */
  public getSubject(filter: GetSubjectsOptions = {}) {
    if (filter.name) {
      const filterName = filter.name;
      return this.subjects.find((subject) => {
        return subject.name.includes(filterName);
      });
    }
    if (filter.bgm) {
      const filterBgm = +filter.bgm;
      return this.subjects.find((subject) => {
        return subject.bgm === filterBgm;
      });
    }

    return undefined;
  }

  public async initializeSource() {
    this.logger.log(lightBlue('同步 Anime Garden 资源'));
    try {
      await this.managers.animegarden.initialize();
      this.logger.log(lightGreen('同步 Anime Garden 资源成功'));
    } catch (error) {
      this.logger.log(lightRed('同步 Anime Garden 资源失败'));
      this.logger.error(error);
    }
    this.logger.log();
  }

  /**
   *
   */
  public async watchSubjects(options: GetSubjectsOptions & PushOptions) {
    for await (const turn of loop(10 * 60 * 1000)) {
      if (turn === 0) {
        await this.loadSubjects();

        const subjects = this.getSubjects(options);
        printSpace(this, subjects);

        this.logger.log(dim('校验 Anime Space 配置与存储'));
        await this.validate();
        this.logger.log(dim('校验 Anime Space 通过'));
        await this.openDownloaderManager();
        this.logger.log();
      } else if (turn > 0) {
        await this.reloadSpace();
        await this.loadSubjects();
        await validateSubjects(this);
        this.managers.animegarden.close();
        this.validated = true;

        const subjects = this.getSubjects(options);
        printSpace(this, subjects);
      }

      const running = new Set<Subject>();
      const subjects = this.getSubjects(options);

      for await (const innerTurn of loop(5 * 60 * 1000)) {
        const tasks = await pushSubjects(
          this,
          subjects.filter((sub) => !running.has(sub))
        );
        for (const task of tasks) {
          running.add(task.subject);
          task.promise.finally(() => {
            running.delete(task.subject);
          });
        }

        if (running.size === 0) {
          break;
        }
      }

      this.logger.log(lightGreen('成功推送 Anime Space 更新'));
      this.logger.log();
    }
  }

  /**
   *
   */
  public async pushSubjects(options: GetSubjectsOptions & PushOptions) {
    await this.loadSubjects();

    const subjects = this.getSubjects(options);
    printSpace(this, subjects);

    this.logger.log(dim('校验 Anime Space 配置与存储'));
    await this.validate();
    this.logger.log(dim('校验 Anime Space 通过'));
    await this.openDownloaderManager();
    this.logger.log();

    const tasks = await pushSubjects(this, subjects);
    await Promise.allSettled(tasks.map((t) => t.promise));

    this.logger.log(lightGreen('成功推送 Anime Space 更新'));
    this.logger.log();
  }

  /**
   *
   */
  public async pullSubjects(options: GetSubjectsOptions & PullOptions) {
    await this.loadSubjects();

    const subjects = this.getSubjects(options);
    printSpace(this, subjects);

    this.logger.log(dim('校验 Anime Space 配置与存储'));
    await this.validate();
    this.logger.log(dim('校验 Anime Space 通过'));
    this.logger.log();

    await pullSubjects(this, subjects);
  }
}

export async function makeSystem(root?: string) {
  const system = new System();
  await system.loadSpace(root);
  return system;
}
