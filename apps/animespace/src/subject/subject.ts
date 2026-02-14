import type { System } from '../system/system.ts';

import type { RawCollection, RawSubject } from './schema.ts';

export interface SubjectStorage {
  readonly driver: string;

  readonly path: string;
}

export class Subject {
  private readonly system: System;

  public readonly name: string;

  public readonly enabled: boolean;

  public readonly bgm?: number;

  public readonly tmdb?: {
    type: string;
    id: number;
  };

  public readonly storage: SubjectStorage;

  public readonly naming: unknown;

  public readonly source: unknown;

  public constructor(
    system: System,
    options: {
      name: string;
      enabled: boolean;
      bgm?: number;
      tmdb?: {
        type: string;
        id: number;
      };
      storage: SubjectStorage;
      naming: unknown;
      source: unknown;
    }
  ) {
    this.system = system;
    this.name = options.name;
    this.enabled = options.enabled;
    this.bgm = options.bgm;
    this.tmdb = options.tmdb;
    this.storage = options.storage;
    this.naming = options.naming;
    this.source = options.source;
  }

  public static fromRaw(
    system: System,
    rawCollection: RawCollection,
    rawSubject: RawSubject
  ): Subject {
    return new Subject(system, {
      name: rawSubject.name,
      enabled: rawSubject.enabled ?? rawCollection.enabled ?? true,
      bgm: rawSubject.bgm,
      tmdb: rawSubject.tmdb,
      storage: {
        driver: rawSubject.storage?.driver ?? 'default',
        path: rawSubject.storage?.path ?? rawSubject.name
      },
      naming: rawSubject.naming,
      source: rawSubject.source
    });
  }
}
