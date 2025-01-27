import type { ParseResult } from 'anipar';

export interface NewResource {
  provider: string;

  providerId: string;

  title: string;

  href: string;

  type: string;

  magnet: string;

  tracker: string;

  // x KB, y MB, ...
  size: string;

  createdAt: Date;

  fetchedAt?: Date;

  publisher: string;

  fansub?: string;

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

  duplicatedId: number | null;

  metadata: { anipar?: ParseResult } | null;
}

export interface InsertResourcesOptions {
  /**
   * Whether match resources' title with active subjects
   *
   * @default true
   */
  indexSubject?: boolean;

  /**
   * @default false
   */
  keepshare?: boolean;
}
