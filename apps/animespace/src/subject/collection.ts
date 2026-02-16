import type { LocalPath } from '../utils/fs.ts';
import type { System } from '../system/system.ts';

import { subjects } from '../sqlite/subject.ts';

import type { Preference } from './preference.ts';
import type { RawCollection } from './schema.ts';

import { Subject } from './subject.ts';

export class Collection {
  public readonly system: System;

  public readonly file: LocalPath;

  public readonly name?: string;

  public readonly enabled: boolean;

  public readonly preference?: Preference;

  public readonly subjects: Subject[];

  public constructor(
    system: System,
    options: {
      file: LocalPath;
      name?: string;
      enabled?: boolean;
      preference?: Preference;
      subjects: Subject[];
    }
  ) {
    this.system = system;
    this.file = options.file;
    this.name = options.name;
    this.enabled = options.enabled ?? true;
    this.preference = options.preference;
    this.subjects = options.subjects;
  }

  public static fromRaw(system: System, file: LocalPath, rawCollection: RawCollection): Collection {
    const subjects = rawCollection.subjects.map((rawSubject) =>
      Subject.fromRaw(system, rawCollection, rawSubject)
    );

    return new Collection(system, {
      file,
      name: rawCollection.name,
      enabled: rawCollection.enabled,
      preference: rawCollection.preference,
      subjects
    });
  }

  public async upsertToDatabase() {
    const database = await this.system.openDatabase();
    // TODO
  }
}
