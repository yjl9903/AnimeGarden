import { parseSearchURL } from 'animegarden';

import { removeQuote } from '../utils';

export function generateFeed(params: URLSearchParams) {
  const filter = parseSearchURL(params);
  // Hack: manually remove duplicate
  if (!filter.provider && filter.duplicate === false) {
    delete filter['duplicate'];
  }
  if (filter.search) {
    filter.search = removeQuote(filter.search);
  }
  return JSON.stringify([{ ...filter, page: undefined, pageSize: undefined }]);
}
