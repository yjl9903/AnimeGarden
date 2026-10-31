import { parseURLSearch, stringifyURLSearch } from '@animegarden/client';
import { encodeResourcesCursor } from '@animegarden/shared';

import type { FeedOptions } from './types.ts';

/** Canonicalize subscription sets for content caching and the channel link. */
export function normalizeFeedOptions(options: FeedOptions) {
  const { tracker, pagination } = options;
  const { filter } = parseURLSearch(undefined, options.filter);
  // Keep the decoded cursor for the query layer; encode it only for the canonical cache identity.
  const canonical = stringifyURLSearch({
    ...filter,
    limit: pagination.limit,
    cursor: pagination.cursor ? encodeResourcesCursor(pagination.cursor) : undefined
  });
  if (!tracker) canonical.set('tracker', 'false');
  canonical.sort();
  const query = canonical.toString();
  return { pagination, filter, tracker, search: query ? `?${query}` : '' };
}
