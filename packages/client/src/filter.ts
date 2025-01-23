import type { ProviderType } from './constants';

export interface ResolvedFilterOptions {
  page: number;

  pageSize: number;

  providers: ProviderType[];

  duplicate: boolean;

  types?: string[];

  after?: Date;

  before?: Date;

  fansubs?: string[];

  publishers?: string[];

  search?: string[];

  include?: string[];

  keywords?: string[];

  exclude?: string[];
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
       * Only filter resources in the specific provider
       */
      provider?: string;

      /**
       * Only filter resources in the specific provider
       */
      providers?: null | undefined;
    }
  | {
      /**
       * Only filter resources in the specific provider
       */
      provider?: null | undefined;

      /**
       * Only filter resources in the specific provider
       */
      providers?: string[];
    }
) &
  (
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
