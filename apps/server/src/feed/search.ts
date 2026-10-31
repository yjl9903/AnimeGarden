import { parseURLSearch, stringifyURLSearch } from '@animegarden/client';

import type { FeedOptions } from './types.ts';

/** Canonicalize subscription sets for content caching and the channel link. */
export function normalizeFeedOptions(options: FeedOptions) {
  const { tracker } = options;
  const { pagination, filter } = parseURLSearch(undefined, {
    ...options.pagination,
    ...options.filter
  });
  const canonical = stringifyURLSearch({ ...pagination, ...filter });
  if (!tracker) canonical.set('tracker', 'false');
  canonical.sort();
  const query = canonical.toString();
  return { pagination, filter, tracker, search: query ? `?${query}` : '' };
}
