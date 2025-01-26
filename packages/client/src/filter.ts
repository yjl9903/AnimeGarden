import type { Resource } from './types';
import type { ProviderType } from './constants';

export type FetchResourcesOptions = FilterOptions & {
  /**
   * Fetch method
   */
  fetch?: (request: RequestInfo, init?: RequestInit) => Promise<Response>;

  /**
   * The base URL of anime garden API
   *
   * @default 'https://garden.breadio.wiki/api/'
   */
  baseURL?: string;

  /**
   * Query count resources
   */
  count?: number;

  /**
   * The number of retry times
   */
  retry?: number;

  /**
   * Abort fetch
   */
  signal?: AbortSignal;

  /**
   * Should return tracker
   *
   * @default false
   */
  tracker?: boolean;

  /**
   * Should return metadata
   *
   * @default false
   */
  metadata?: boolean;

  /**
   * Request headers
   */
  headers?: Record<string, string | ReadonlyArray<string>>;

  /**
   * Progress callback when querying multiple pages
   */
  progress?: (
    delta: Resource[],
    payload: { url: string; page: number; timestamp: Date }
  ) => void | Promise<void>;
};

export interface FetchResourceDetailOptions {
  /**
   * Fetch method
   */
  fetch?: (request: RequestInfo, init?: RequestInit) => Promise<Response>;

  /**
   * The base URL of anime garden API
   *
   * @default 'https://garden.breadio.wiki/api/'
   */
  baseURL?: string;

  /**
   * Abort fetch
   */
  signal?: AbortSignal;

  /**
   * The number of retry
   */
  retry?: number;

  /**
   * Request headers
   */
  headers?: Record<string, string | ReadonlyArray<string>>;
}

export type FilterOptions = {
  /**
   * Query the specified page
   *
   * @default 1
   */
  page?: number;

  /**
   * Page size
   *
   * @default 100
   */
  pageSize?: number;

  /**
   * Only filter resources in the specific provider
   */
  provider?: string;

  /**
   * Whether include duplicated resources from different platfrom.
   *
   * @default false
   */
  duplicate?: boolean;

  /**
   * Resources uploaded after the specified date
   */
  after?: Date;

  /**
   * Resources uploaded before the specified date
   */
  before?: Date;

  /**
   * Search in titles
   */
  search?: string | string[];

  /**
   * Include at least one of titles
   */
  include?: string | string[];

  /**
   * Include all the keywords
   */
  keywords?: string | string[];

  /**
   * Exclude keywords
   */
  exclude?: string | string[];
} & (
  | {
      /**
       * Filter by the resource type
       */
      type?: string;

      /**
       * Filter by the resource type
       */
      types?: null | undefined;
    }
  | {
      /**
       * Filter by the resource type
       */
      type?: null | undefined;

      /**
       * Filter by the resource type
       */
      types?: string[];
    }
) &
  (
    | {
        /**
         * Filter by the bangumi subject id
         */
        subject?: number;

        /**
         * Filter by the bangumi subject ids
         */
        subjects?: null | undefined;
      }
    | {
        /**
         * Filter by the bangumi subject id
         */
        subject?: null | undefined;

        /**
         * Filter by the bangumi subject ids
         */
        subjects?: number[];
      }
  ) &
  (
    | {
        /**
         * Filter by the fansub names
         */
        fansub?: string;

        /**
         * Filter by the fansub names
         */
        fansubs?: null | undefined;
      }
    | {
        /**
         * Filter by the fansub names
         */
        fansub?: null | undefined;

        /**
         * Filter by the fansub names
         */
        fansubs?: string[];
      }
  ) &
  (
    | {
        /**
         * Filter by the publisher names
         */
        publisher?: string;

        /**
         * Filter by the publisher names
         */
        publishers?: null | undefined;
      }
    | {
        /**
         * Filter by the publisher names
         */
        publisher?: null | undefined;

        /**
         * Filter by the publisher names
         */
        publishers?: string[];
      }
  );

export interface ResolvedFilterOptions {
  page: number;

  pageSize: number;

  provider?: ProviderType;

  duplicate?: boolean;

  types?: string[];

  after?: Date;

  before?: Date;

  fansubs?: string[];

  publishers?: string[];

  subjects?: number[];

  search?: string[];

  include?: string[];

  keywords?: string[];

  exclude?: string[];
}

// export function makeResourcesFilter(filter: Omit<ResolvedFilterOptions, 'page' | 'pageSize' | 'duplicate'>) {
//   const conds: Array<(res: Resource) => boolean> = [];

//   return (res: Resource) => {
//     return conds.every(c => c(res));
//   }
// }
