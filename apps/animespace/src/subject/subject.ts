import type { System } from '../system/system.ts';

import type { RawCollection, RawSubject } from './schema.ts';
import type { ExtractedSubjectResource, ParsedSubjectResource } from './source/resource.ts';
import type { SubjectSource } from './source/source.ts';
import type { SubjectNaming } from './source/naming.ts';

import { SubjectType } from './source/schema.ts';
import { fetchResources, extractResources } from './source/extract.ts';
import { DefaultNamingTemplate, type NamingTemplate } from './source/naming.ts';
import { mergePreferenceValue, mergeSubjectSourcePreference } from './preference.ts';

export interface SubjectStorage {
  readonly driver: string;

  readonly path: string;
}

export class Subject {
  private readonly system: System;

  public readonly name: string;

  public readonly enabled: boolean;

  public readonly type: SubjectType;

  public readonly bgm?: number;

  public readonly tmdb?: {
    type: string;
    id: number;
  };

  public readonly storage: SubjectStorage;

  public readonly naming: SubjectNaming;

  public readonly source: SubjectSource;

  public constructor(
    system: System,
    options: {
      name: string;
      enabled: boolean;
      type: SubjectType;
      bgm?: number;
      tmdb?: {
        type: string;
        id: number;
      };
      storage: SubjectStorage;
      naming: SubjectNaming;
      source: SubjectSource;
    }
  ) {
    this.system = system;
    this.name = options.name;
    this.enabled = options.enabled;
    this.type = options.type;
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
    const rawNaming = rawSubject.naming ?? {};

    const rootPreference = system.space.preference;
    const collectionPreference = rawCollection.preference;

    const source = mergeSubjectSourcePreference(
      rawSubject.source,
      collectionPreference,
      rootPreference
    );

    const namingTemplate = mergePreferenceValue<NamingTemplate>(
      rawNaming.template,
      collectionPreference?.naming?.template,
      rootPreference?.naming?.template,
      DefaultNamingTemplate
    ) as NamingTemplate;

    const naming: SubjectNaming = {
      name: rawNaming.name ?? rawSubject.name,
      template: namingTemplate,
      season: rawNaming.season,
      year: rawNaming.year,
      month: rawNaming.month
    };

    return new Subject(system, {
      name: rawSubject.name,
      enabled: rawSubject.enabled ?? rawCollection.enabled ?? true,
      type: rawSubject.type,
      bgm: rawSubject.bgm,
      tmdb: rawSubject.tmdb,
      storage: {
        driver: rawSubject.storage?.driver ?? 'default',
        path: rawSubject.storage?.path ?? rawSubject.name
      },
      naming,
      source
    });
  }

  public async fetchResources(): Promise<ParsedSubjectResource[]> {
    return await fetchResources(this.system, this);
  }

  public async extractResources(
    resources: ParsedSubjectResource[]
  ): Promise<ExtractedSubjectResource[]> {
    return await extractResources(this.system, this, resources);
  }
}
