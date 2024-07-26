import MeiliSearch from 'meilisearch';

import { parse } from 'anitomy';
import { and, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { normalizeTitle, type FetchedResource } from 'animegarden';

import type { Resource } from '../schema';
import type { Database } from '../connection';

import { toShanghai } from '../utils';
import { insertResourceDocuments } from '../meilisearch';

import { resources } from '../schema/resource';

export async function insertMoeResources(
  database: Database,
  meili: MeiliSearch,
  fetchedResources: FetchedResource[]
) {
  const now = new Date();
  const res = fetchedResources.map((r) => transformResource(r, now));

  const data = await database.insert(resources).values(res).onConflictDoNothing().returning({
    id: resources.id,
    providerId: resources.providerId,
    isDuplicated: resources.isDuplicated
  });

  const map = new Map(res.map((r) => [r.providerId, r] as const));
  const docs = data
    .map((r) => {
      const item = map.get(r.providerId);
      if (item) {
        // Manually add default fields
        return { id: r.id, isDeleted: false, ...item, isDuplicated: r.isDuplicated };
      }
    })
    .filter(Boolean) as Resource[];
  if (docs.length > 0) {
    await insertResourceDocuments(meili, docs);
  }

  return data;
}

function transformResource(resource: FetchedResource, now: Date) {
  const titleAlt = normalizeTitle(resource.title);

  return {
    provider: 'moe' as const,
    providerId: resource.providerId,
    href: resource.href,
    title: resource.title,
    titleAlt,
    type: resource.type,
    // TODO: check this
    size: resource.size ?? '',
    magnet: resource.magnet,
    tracker: resource.tracker,
    // Convert to UTC+8
    createdAt: toShanghai(new Date(resource.createdAt)),
    fetchedAt: toShanghai(new Date(now)),
    anitomy: resource.type === '動畫' ? JSON.stringify(parse(resource.title)) : undefined,
    fansubId: resource.fansub?.id ? resource.fansub?.id : undefined,
    publisherId: resource.publisher.id,
    isDuplicated: sql`EXISTS (SELECT 1 FROM ${resources} WHERE ${resources.magnet} = ${resource.magnet} OR ${resources.title} = ${resource.title})`
  };
}
