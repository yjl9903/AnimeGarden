import type { Context } from 'hono';
import type { ResolvedFilterOptions } from 'animegarden';

import { searchResources } from './search';

export async function queryResources(ctx: Context, filter: ResolvedFilterOptions) {
  if (filter.search) {
    const resp = await searchResources(filter.search.join(' '), filter);
    return {
      resources: resp.resources,
      complete: resp.complete
    };
  } else {
    return { resources: [], complete: true };
  }
}
