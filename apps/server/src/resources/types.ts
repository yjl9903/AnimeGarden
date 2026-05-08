import type { ParseResult } from 'anipar';
import type { ResolvedFilterOptions } from '@animegarden/client';

import type { NotifiedResource } from '../system/types.ts';

export interface NewParty {
  providerId?: string;

  name: string;

  avatar?: string;
}

export interface NewResource {
  provider: string;

  providerId: string;

  title: string;

  href: string;

  type: string;

  magnet: string;

  tracker: string;

  // x KB, y MB, ...
  size: string | number;

  createdAt: Date;

  fetchedAt?: Date;

  publisher?: NewParty;

  fansub?: NewParty;

  isDeleted?: boolean | null | undefined;
}

export interface DatabaseResource {
  id: number;

  provider: string;

  providerId: string;

  title: string;

  href: string;

  type: string;

  magnet: string;

  tracker: string;

  size: number;

  createdAt: Date;

  fetchedAt: Date;

  publisherId: number;

  fansubId: number | null;

  subjectId: number | null;

  isDeleted: boolean | null;

  duplicatedId: number | null;

  metadata: { anipar?: ParseResult } | null;
}

export type RedisQueryResource = Omit<DatabaseResource, 'createdAt' | 'fetchedAt'> & {
  createdAt: string;
  fetchedAt: string;
};

export interface UpsertResourcesOptions {
  /**
   * Whether match resources' title with active subjects
   *
   * @default true
   */
  indexSubject?: boolean;
}

export type InsertResourcesOptions = UpsertResourcesOptions;

export interface UpsertResourcesResult {
  inserted: NotifiedResource[];

  updated: NotifiedResource[];

  changed: number[];

  errors: NewResource[];
}

export interface DuplicateMaintenanceResult {
  attached: number[];

  detached: number[];
}

export interface SyncDeletedResourcesResult {
  deleted: NotifiedResource[];
}

export type DatabaseFilterOptions = Omit<
  Partial<ResolvedFilterOptions>,
  'publishers' | 'fansubs'
> & {
  publishers?: number[];
  fansubs?: number[];
};
