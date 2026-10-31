import type { ResolvedFilterOptions, ResolvedPaginationOptions } from '@animegarden/client';

/** Parsed subscription options, independent of the request transport. */
export interface FeedOptions {
  /** Parsed resource filters; set-valued terms are normalized by the feed module. */
  filter: ResolvedFilterOptions;

  /** Resource page and page size, validated by the caller. */
  pagination: ResolvedPaginationOptions;

  /** Whether enclosure magnet links include tracker URLs. */
  tracker: boolean;
}

/** Generated content and source freshness; the controller decides HTTP cache semantics. */
export interface FeedContent {
  /** Serialized RSS document. */
  xml: string;

  /** SHA-1 hex digest of the XML, without HTTP ETag quoting. */
  digest: string;

  /** XML generation time as Unix milliseconds. */
  generatedAt: number;

  /**
   * Cache initialization or latest invalidation time captured when rendering starts,
   * in Unix milliseconds. This is not a database modification timestamp;
   * undefined means the time is unknown.
   */
  changedAt: number | undefined;

  /** Whether the content still belongs to the active cache when returned. */
  stable: boolean;
}
