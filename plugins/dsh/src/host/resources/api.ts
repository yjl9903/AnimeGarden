/**
 * Public API access and resource mapping for the `animegarden_search_resources`
 * tool.
 *
 * Network access, URL building, retries, and response validation are delegated
 * to `@animegarden/client`; this module only turns the client's failure results
 * into readable tool errors and projects resources onto the tool's stable output
 * shape using the display fields shared with the Web panel.
 */

import type {
  ClientFailure,
  FetchResourcesOptions,
  PaginationResult,
  ResolvedFilterOptions,
  Resource
} from '@animegarden/client';

import { fetchResources } from '@animegarden/client';

import type { ResolvedOptions } from '../shared/types';

import { toBaseURL } from '../shared/utils';
import { toResourceDisplay } from '../../shared/resource';
import { REQUEST_TIMEOUT_MS } from '../shared/constants';

import type { FetchRequest, ToolFilter, ToolResource } from './types';

/**
 * Turn a client failure result into a readable tool error. Cancellation stays
 * distinguishable from timeouts and HTTP/network failures.
 *
 * @param failure - the client's `{ ok: false, code, error }` result.
 * @returns readable error message.
 */
function describeFailure({ code, error }: ClientFailure): string {
  if (code === 'ABORTED') return 'animegarden_search_resources was cancelled.';
  if (code === 'TIMEOUT') {
    return `AnimeGarden API request timed out after ${REQUEST_TIMEOUT_MS} ms.`;
  }
  const status = error.status;
  const detail = error.message.length > 0 ? error.message : 'unknown error';
  return `AnimeGarden API request failed (${code}${status !== undefined ? `, HTTP ${status}` : ''}): ${detail}`;
}

/**
 * Run one resource search through the public client.
 *
 * The client combines the plugin's 15 s per-request budget with the tool call's
 * cancellation signal internally and returns either a success result or a
 * `{ ok: false, code, error }` failure.
 *
 * @param options - resolved bundle config.
 * @param request - mapped arguments.
 * @param signal - tool-call cancellation signal.
 * @returns the client's successful result.
 */
export async function searchResources(
  options: ResolvedOptions,
  request: FetchRequest,
  signal: AbortSignal | undefined
): Promise<{
  resources: Resource[];
  pagination: PaginationResult;
  filter: ResolvedFilterOptions | undefined;
  timestamp: Date;
}> {
  const filters = request.filters;
  const requestOptions: FetchResourcesOptions = {
    baseURL: toBaseURL(options.baseURL),
    // The tool names the result count `limit`; the client option is `pageSize`.
    // `page` is omitted because the tool always reads the first result set.
    pageSize: request.limit,
    search: filters.search,
    include: filters.include,
    keywords: filters.keywords,
    exclude: filters.exclude,
    types: filters.types,
    fansubs: filters.fansubs,
    publishers: filters.publishers,
    subjects: filters.subjects,
    provider: filters.provider,
    preset: filters.preset as FetchResourcesOptions['preset'],
    after: filters.after,
    before: filters.before,
    timeout: REQUEST_TIMEOUT_MS,
    signal,
    // Keep the bare magnet: tracker URLs would only inflate the rendered table.
    tracker: false
  };

  let result;
  try {
    result = await fetchResources(requestOptions);
  } catch (error) {
    // The client only throws here for misuse (for example an invalid base URL).
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`AnimeGarden API request failed: ${detail}`);
  }

  if (!result.ok) throw new Error(describeFailure(result));

  return {
    resources: result.resources,
    pagination: result.pagination,
    filter: result.filter,
    timestamp: result.timestamp
  };
}

/** Serialize one optional date to the ISO string the output schema declares. */
function isoDate(value: Date | undefined): string | undefined {
  return value === undefined ? undefined : value.toISOString();
}

/**
 * Project the client's resolved filter onto the tool's JSON-safe output shape.
 * Only groups actually present are emitted; dates become ISO strings.
 *
 * @param filter - the resolved filter from the public API response.
 * @returns JSON-safe filter groups.
 */
export function mapFilter(filter: ResolvedFilterOptions | undefined): ToolFilter {
  if (filter === undefined) return {};
  const out: ToolFilter = {};
  if (filter.preset !== undefined) out.preset = filter.preset;
  if (filter.provider !== undefined) out.provider = filter.provider;
  if (filter.types !== undefined) out.types = filter.types;
  if (filter.fansubs !== undefined) out.fansubs = filter.fansubs;
  if (filter.publishers !== undefined) out.publishers = filter.publishers;
  if (filter.subjects !== undefined) out.subjects = filter.subjects;
  if (filter.search !== undefined) out.search = filter.search;
  if (filter.include !== undefined) out.include = filter.include;
  if (filter.keywords !== undefined) out.keywords = filter.keywords;
  if (filter.exclude !== undefined) out.exclude = filter.exclude;
  const after = isoDate(filter.after);
  if (after !== undefined) out.after = after;
  const before = isoDate(filter.before);
  if (before !== undefined) out.before = before;
  return out;
}

/**
 * Map one client resource onto the tool's stable output shape. Every field is
 * always present so the declared output schema can require it; the display
 * fields come from the projection shared with the Web panel, and the client's
 * `Date` is serialized to the ISO string the output schema declares.
 *
 * @param resource - one `Resource` from `@animegarden/client`.
 * @returns normalized resource.
 */
export function mapResource(resource: Resource): ToolResource {
  const display = toResourceDisplay(resource);
  const createdAt = display.createdAt instanceof Date ? display.createdAt.toISOString() : '';

  return {
    provider: display.provider,
    providerId: display.providerId,
    title: display.title,
    href: display.href,
    type: display.type,
    magnet: display.magnet,
    size: display.size,
    sizeText: display.sizeText,
    fansub: display.fansub,
    publisher: display.publisher,
    detailUrl: display.detailUrl,
    keepshareUrl: display.keepshareUrl,
    createdAt
  };
}
