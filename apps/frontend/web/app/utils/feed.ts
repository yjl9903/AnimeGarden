import { parseSearchURL, type ResolvedFilterOptions } from 'animegarden';

import { removeQuote } from './string';

export function generateFeed(...params: URLSearchParams[]) {
  const filters: any[] = [];
  for (const param of params) {
    const filter: Partial<ResolvedFilterOptions> = parseSearchURL(param);
    // Hack: manually remove duplicate
    if (!filter.provider && filter.duplicate === false) {
      delete filter['duplicate'];
    }
    if (filter.search) {
      filter.search = removeQuote(filter.search);
    }
    if (filter.page) {
      delete filter['page'];
    }
    if (filter.pageSize) {
      delete filter['pageSize'];
    }
    filters.push({ ...filter });
  }
  return encodeURIComponent(JSON.stringify(filters));
}
