import { DuplicatedManager } from './duplicated';

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
}

export interface InsertResourcesOptions {
  /**
   * Whether match resources' title with active subjects
   *
   * @default false
   */
  indexSubject?: boolean;

  /**
   * Check duplicated in memory
   */
  duplicatedManager?: DuplicatedManager;
}
