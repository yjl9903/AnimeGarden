/**
 * Local structural types owned by the resource-search tool.
 */

import type { ProviderType } from '@animegarden/client';

/** One normalized resource in the tool's structured output. */
export interface ToolResource {
  provider: string;
  providerId: string;
  title: string;
  href: string;
  /** Generated AnimeGarden detail URL. */
  detailUrl: string;
  type: string;
  magnet: string;
  keepshareUrl: string;
  size: number;
  sizeText: string;
  fansub: string;
  publisher: string;
  createdAt: string;
}

/** Pagination metadata mirrored from the public API response. */
export interface ToolPagination {
  page: number;
  pageSize: number;
  complete: boolean;
}

/** Resolved filter groups the public API applied, with dates serialized as ISO strings. */
export interface ToolFilter {
  preset?: string;
  provider?: string;
  types?: string[];
  after?: string;
  before?: string;
  fansubs?: string[];
  publishers?: string[];
  subjects?: number[];
  search?: string[];
  include?: string[];
  keywords?: string[];
  exclude?: string[];
}

/** Structured result of one `animegarden_search_resources` call. */
export interface SearchResult {
  filter: ToolFilter;
  pagination: ToolPagination;
  /** Response timestamp reported by the public API (ISO 8601). */
  timestamp: string;
  resources: ToolResource[];
}

/**
 * Filters mapped from the tool arguments onto `FetchResourcesOptions`.
 *
 * The tool arguments use the plural forms (`types`, `fansubs`, `publishers`), so
 * one flat shape is enough here.
 */
export interface SearchFilters {
  provider?: ProviderType;
  after?: Date;
  before?: Date;
  search?: string[];
  include?: string[];
  keywords?: string[];
  exclude?: string[];
  types?: string[];
  subjects?: number[];
  fansubs?: string[];
  publishers?: string[];
  preset?: string;
}

/** One search request mapped from the tool arguments. */
export interface FetchRequest {
  /** Result count requested by the tool (`limit`), sent as the client's `pageSize`. */
  limit: number;
  filters: SearchFilters;
}
