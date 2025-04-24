import type { ParseResult } from 'anipar';

import type { SupportProviders } from './constants';

export type ProviderType = (typeof SupportProviders)[number];

/**
 * Transform type to corresponding JSON.parse(JSON.stringify(...))
 */
export type Jsonify<T> = T extends string | number | boolean | null
  ? T
  : T extends Date
    ? string
    : T extends Function | undefined
      ? null // Functions and undefined are not serializable
      : T extends object
        ? T extends Array<infer U>
          ? Jsonify<U>[] // Handle arrays
          : {
              [K in keyof T as K extends symbol ? never : K]: Jsonify<T[K]>; // Handle objects and recurse
            }
        : never;

export interface Resource<T extends { tracker?: boolean; metadata?: boolean } = {}> {
  id: number;

  provider: string;

  providerId: string;

  title: string;

  href: string;

  type: string;

  magnet: string;

  tracker: T['tracker'] extends true
    ? string
    : T['tracker'] extends false
      ? null | undefined
      : string | null | undefined;

  size: number;

  fansub?: {
    id: number;

    name: string;

    avatar?: string;
  };

  publisher: {
    id: number;

    name: string;

    avatar?: string;
  };

  subjectId?: number;

  createdAt: Date;

  fetchedAt: Date;

  metadata?: T['metadata'] extends true
    ? { anipar?: ParseResult }
    : T['metadata'] extends false
      ? null | undefined
      : { anipar?: ParseResult } | null | undefined;
}

export interface ResourceDetail {
  description: string;

  files: Array<{
    name: string;

    size: string;
  }>;

  magnets: Array<{
    name: string;

    url: string;
  }>;

  hasMoreFiles: boolean;
}

export interface ScrapedResource {
  provider: string;

  providerId: string;

  title: string;

  href: string;

  type: string;

  magnet: string;

  tracker: string;

  size: string;

  publisher?: {
    id: string;

    name: string;

    avatar?: string;
  };

  fansub?: {
    id: string;

    name: string;

    avatar?: string;
  };

  /**
   * Date.toISOString()
   */
  createdAt: string;
}

export interface ScrapedResourceDetail
  extends Omit<ScrapedResource, 'magnet' | 'tracker'>,
    ResourceDetail {}

export type FetchOptions = {
  /**
   * Fetch method
   */
  fetch?: (request: RequestInfo, init?: RequestInit) => Promise<Response>;

  /**
   * The base URL of anime garden API
   *
   * @default 'https://api.animes.garden/'
   */
  baseURL?: string;

  /**
   * The number of retry times
   *
   * @default 0
   */
  retry?: number;

  /**
   * Timeout for single request
   */
  timeout?: number;

  /**
   * Abort fetch signal
   */
  signal?: AbortSignal;

  /**
   * Extra request headers
   */
  headers?: Record<string, string | ReadonlyArray<string>>;

  /**
   * Hooks
   */
  hooks?: {
    prefetch?: (path: string, init: RequestInit) => Promise<void> | void;

    postfetch?: (path: string, init: RequestInit, response: Response) => Promise<void> | void;

    timeout?: () => Promise<void> | void;
  };
};

export type FetchResourcesOptions = FilterOptions &
  FetchOptions & {
    /**
     * Query count resources
     * -1 to fetch all the matched resource
     */
    count?: number;

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
     * Progress callback when querying multiple pages
     */
    progress?: (
      delta: Resource[],
      payload: { url: string; searchParams: URLSearchParams; page: number }
    ) => void | Promise<void>;
  };

export type FetchResourceDetailOptions = FetchOptions & {};

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
) & {
    /**
     * Filter by the bangumi subject id
     */
    subject?: number;

    /**
     * Filter by the bangumi subject ids
     */
    subjects?: number[];
  } & (
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

export interface Collection<S extends boolean = boolean> {
  hash?: string;

  name: string;

  authorization: string;

  filters: CollectionFilter<S, false>[];
}

export interface CollectionResult<
  S extends boolean = false,
  R extends boolean = false,
  T extends { tracker?: boolean; metadata?: boolean } = {}
> {
  ok: boolean;

  hash: string;

  name: string;

  createdAt: string;

  filters: CollectionFilter<S, R, T>[];

  timestamp: Date;
}

export interface CollectionResourcesResult<
  S extends boolean = false,
  R extends boolean = false,
  T extends { tracker?: boolean; metadata?: boolean } = {}
> {
  ok: boolean;

  hash: string;

  name: string;

  filters: CollectionFilter<S, R, T>[];

  createdAt: string;

  results: Array<{
    resources: Resource<T>[];
    complete: boolean;
    filter: Omit<ResolvedFilterOptions, 'page'> | undefined;
  }>;

  timestamp: Date;
}

export type CollectionFilter<
  S extends boolean = false,
  R extends boolean = true,
  T extends { tracker?: boolean; metadata?: boolean } = {}
> = Omit<ResolvedFilterOptions, 'page' | 'pageSize'> & {
  name: string;

  searchParams: S extends true ? string : S extends false ? undefined : string | undefined;
} & (R extends true
    ? {
        resources: Resource<T>[];

        complete: boolean;
      }
    : R extends false
      ? {}
      : {
          resources?: Resource<T>[];

          complete?: boolean;
        });
