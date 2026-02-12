import type { System } from '../system/system.js';
import type { LocalPath } from '../utils/fs.js';

import type { RawCollection } from './schema.js';

import { Subject } from './subject.js';

export class Collection {
  public readonly system: System;

  public readonly file: LocalPath;

  public readonly name?: string;

  public readonly enable: boolean;

  public readonly subjects: Subject[];

  public constructor(
    system: System,
    options: {
      file: LocalPath;
      name?: string;
      enable?: boolean;
      subjects: Subject[];
    }
  ) {
    this.system = system;
    this.file = options.file;
    this.name = options.name;
    this.enable = options.enable ?? true;
    this.subjects = options.subjects;
  }

  public static fromRaw(system: System, file: LocalPath, rawCollection: RawCollection): Collection {
    const subjects = rawCollection.subjects.map((rawSubject) =>
      Subject.fromRaw(system, rawCollection, rawSubject)
    );

    return new Collection(system, {
      file,
      name: rawCollection.name,
      enable: rawCollection.enable,
      subjects
    });
  }
}
