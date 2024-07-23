import type { Resource } from '../types';

export type ProviderType = 'dmhy' | 'moe';

export interface FilterOptions {
  /**
   * Only filter resources in the specific provider
   */
  provider?: string | string[];

  /**
   * Whether display duplicate result
   */
  duplicate?: boolean;

  /**
   * Filter by the group id of fansub
   */
  fansubId?: number | string | (number | string)[];

  /**
   * Filter by the group name of fansub
   */
  fansubName?: string | string[];

  /**
   * Filter by the user id of publisher
   */
  publisherId?: number | string | (number | string)[];

  /**
   * Filter by the resource type
   *
   * @type ResourceType
   */
  type?: string;

  /**
   * Resources uploaded before the specified date
   */
  before?: Date;

  /**
   * Resources uploaded after the specified date
   */
  after?: Date;

  /**
   * Search in titles
   */
  search?: string[];

  /**
   * Include at least one of keywords
   */
  include?: string | string[];

  /**
   * Include all the keywords
   */
  keywords?: string[];

  /**
   * Exclude keywords
   */
  exclude?: string[];

  /**
   * Query the specified page
   */
  page?: number;

  /**
   * Page size
   */
  pageSize?: number;
}

export interface ResolvedFilterOptions {
  provider?: string[];

  duplicate: boolean;

  /**
   * Filter by the group id of fansub
   */
  fansubId?: string[];

  /**
   * Filter by the group name of fansub
   */
  fansubName?: string[];

  /**
   * Filter by the user id of publisher
   */
  publisherId?: string[];

  /**
   * Filter by the resource type
   *
   * @type ResourceType
   */
  type?: string;

  /**
   * Resources uploaded before the specified date
   */
  before?: Date;

  /**
   * Resources uploaded after the specified date
   */
  after?: Date;

  /**
   * Search in titles
   */
  search?: string[];

  /**
   * Include at least one of keywords
   */
  include?: string[];

  /**
   * Include all the keywords
   */
  keywords?: string[];

  /**
   * Exclude keywords
   */
  exclude?: string[];

  /**
   * Query the specified page
   */
  page: number;

  /**
   * Page size
   */
  pageSize: number;
}

export interface FetchResourcesOptions extends FilterOptions {
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
}

export interface FetchResourceDetailOptions {
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
