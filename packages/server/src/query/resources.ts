import type { Context } from 'hono';
import type { ResolvedFilterOptions, ResourceType } from 'animegarden';
import {
  type Resource as DbResource,
  type ResourceDocument,
  getTeam,
  getUser
} from '@animegarden/database';

import { hash } from 'ohash';
import { Resource } from 'animegarden';
import { memoAsync } from 'memofunc';

import { database } from '../database';
import { meiliSearch, meiliLogger } from '../meilisearch';

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

async function searchResources(search: string, filter: ResolvedFilterOptions) {
  const filters: string[] = ['is_deleted = false', 'is_duplicated = false'];
  if (filter.type) {
    filters.push(`type = '${filter.type}'`);
  }
  if (filter.after) {
    filters.push(`created_at >= ${(filter.after.getTime() / 1000).toFixed(0)}`);
  }
  if (filter.before) {
    filters.push(`created_at <= ${(filter.before.getTime() / 1000).toFixed(0)}`);
  }
  if (filter.fansubId || filter.fansubName) {
    // TODO: how to model?
    // const fansubs = [];
    // for (const f of filter.fansubId ?? []) {
    // }
  }

  const resp = await meiliSearch.index('resources').search<ResourceDocument>(search, {
    filter: filters,
    limit: filter.pageSize,
    offset: (filter.page - 1) * filter.pageSize,
    sort: ['created_at:desc']
  });
  meiliLogger.info(
    `Search "${search}" hits ${resp.hits.length} items (estimated total ${resp.estimatedTotalHits}) using ${resp.processingTimeMs} ms`
  );

  return {
    resources: await transformFromMeili(resp.hits),
    complete: resp.hits.length < resp.estimatedTotalHits
  };
}

async function transformFromMeili(resources: ResourceDocument[]) {
  const result: Resource[] = [];
  for (const r of resources) {
    const fansub = r.fansub_id ? await getTeam(database, r.provider_type, r.fansub_id) : undefined;
    const publisher = (await getUser(database, r.provider_type, r.publisher_id))!;

    result.push({
      id: r.id,
      provider: r.provider_type,
      providerId: r.provider_id,
      title: r.title,
      href: `https://share.dmhy.org/topics/view/${r.href}`,
      type: r.type as ResourceType,
      magnet: r.magnet,
      size: r.size,
      // When reading this field from cache, it will be transfromed to string
      createdAt: new Date(r.created_at! * 1000).toISOString(),
      fetchedAt: new Date(r.fetched_at! * 1000).toISOString(),
      fansub: fansub
        ? {
            id: fansub.providerId,
            name: fansub.name
            // href: `https://share.dmhy.org/topics/list/team_id/${r.fansubId}`
          }
        : undefined,
      publisher: {
        id: publisher.providerId,
        name: publisher.name
        // href: `https://share.dmhy.org/topics/list/user_id/${publisher.providerId}`
      }
    });
  }
  return result;
}
