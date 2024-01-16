import type { ResolvedFilterOptions, ResourceType } from 'animegarden';
import { type ResourceDocument, getTeam, getUser } from '@animegarden/database';

import { hash } from 'ohash';
import { Resource } from 'animegarden';
import { memoAsync } from 'memofunc';

import { database } from '../database';
import { meiliSearch, meiliLogger } from '../meilisearch';

export async function searchResources(search: string, filter: ResolvedFilterOptions) {
  const filters: string[] = ['isDeleted = false', 'isDuplicated = false'];
  if (filter.provider) {
    const providers = filter.provider.map((p) => `'${p}'`).join(',');
    filters.push(`provider in [${providers}]`);
  }
  if (filter.type) {
    filters.push(`type = '${filter.type}'`);
  }
  if (filter.after) {
    filters.push(`createdAt >= ${filter.after.getTime()}`);
  }
  if (filter.before) {
    filters.push(`createdAt <= ${filter.before.getTime()}`);
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
    sort: ['createdAt:desc']
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
    const fansub = r.fansubId ? await getTeam(database, r.provider, r.fansubId) : undefined;
    const publisher = (await getUser(database, r.provider, r.publisherId))!;

    const href = r.provider === 'dmhy' ? `https://share.dmhy.org/topics/view/${r.href}` : r.href;
    const fansubHref =
      r.provider === 'dmhy' && r.fansubId
        ? `https://share.dmhy.org/topics/list/team_id/${r.fansubId}`
        : undefined;
    const publisherHref =
      r.provider === 'dmhy'
        ? `https://share.dmhy.org/topics/list/user_id/${r.publisherId}`
        : undefined;

    result.push({
      id: r.id,
      provider: r.provider,
      providerId: r.providerId,
      title: r.title,
      href,
      type: r.type as ResourceType,
      magnet: r.magnet,
      size: r.size,
      // When reading this field from cache, it will be transfromed to string
      createdAt: new Date(r.createdAt!).toISOString(),
      fetchedAt: new Date(r.fetchedAt!).toISOString(),
      fansub: fansub
        ? {
            id: fansub.providerId,
            name: fansub.name,
            // @ts-ignore
            href: fansubHref
          }
        : undefined,
      publisher: {
        id: publisher.providerId,
        name: publisher.name,
        // @ts-ignore
        href: publisherHref
      }
    });
  }
  return result;
}
