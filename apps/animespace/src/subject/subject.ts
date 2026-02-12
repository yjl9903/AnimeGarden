import type { System } from '../system/system.js';

import type { RawCollection, RawSubject } from './schema.js';

export interface SubjectStorage {
  readonly driver: string;
  readonly path: string;
}

export class Subject {
  public readonly system: System;

  public readonly name: string;

  public readonly enable: boolean;

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
      enable: boolean;
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
    this.enable = options.enable;
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
      enable: rawSubject.enable ?? rawCollection.enable ?? true,
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
