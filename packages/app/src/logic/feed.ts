import { parseSearchURL } from '@animegarden/client';

import { removeQuote } from '../utils';

export function generateFeed(...params: URLSearchParams[]) {
  const filters: any[] = [];
  for (const param of params) {
    const filter = parseSearchURL(param);
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
