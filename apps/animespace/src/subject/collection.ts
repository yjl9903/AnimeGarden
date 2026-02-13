import type { System } from '../system/system.ts';
import type { LocalPath } from '../utils/fs.ts';

import type { RawCollection } from './schema.ts';

import { Subject } from './subject.ts';

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
