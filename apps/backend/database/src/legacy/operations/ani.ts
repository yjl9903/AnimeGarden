import MeiliSearch from 'meilisearch';

import { parse } from 'anitomy';
import { desc, eq, sql } from 'drizzle-orm';
import { normalizeTitle, type FetchedResource } from '@animegarden/client';

import type { Resource } from '../schema';
import type { Database } from '../connection';

import { resources } from '../schema/resource';
import { prefetchKeepShare } from './keepshare';
import { insertResourceDocuments } from '../meilisearch';

export async function insertANiResources(
  database: Database,
  meili: MeiliSearch,
  fetchedResources: FetchedResource[]
) {
  const now = new Date();
  const res = fetchedResources.map((r) => transformResource(r, now));

  const data = await database.insert(resources).values(res).onConflictDoNothing().returning({
    id: resources.id,
    provider: resources.provider,
    providerId: resources.providerId,
    magnet: resources.magnet,
    type: resources.type,
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
    prefetchKeepShare(data.filter((d) => ['動畫', '动画'].includes(d.type) && !d.isDuplicated));
    await insertResourceDocuments(meili, docs);
  }

  return data;
}

export async function updateANiResources(
  database: Database,
  meili: MeiliSearch,
  from: number,
  to: number
) {
  const resp = await database
    .select()
    .from(resources)
    .where(eq(resources.provider, 'ani'))
    .orderBy(desc(resources.createdAt))
    .limit(to - from + 1)
    .offset(from)
    .execute();

  const logs = [];
  for (const resource of resp) {
    const resp = await database
      .update(resources)
      .set({
        isDuplicated: sql`EXISTS (SELECT 1 FROM ${resources} WHERE (${resources.provider} != 'ani') AND (${resources.magnet} = ${resource.magnet} OR ${resources.title} = ${resource.title}))`
      })
      .where(eq(resources.id, resource.id))
      .returning({
        id: resources.id,
        provider: resources.provider,
        providerId: resources.providerId,
        title: resources.title,
        isDuplicated: resources.isDuplicated
      })
      .execute();
    const result = resp[0];
    if (result.isDuplicated != resource.isDuplicated) {
      logs.push(result);
      resource.isDuplicated = result.isDuplicated;
    }
  }

  if (logs.length > 0) {
    await insertResourceDocuments(meili, resp);
  }

  return logs;
}

function transformResource(resource: FetchedResource, now: Date) {
  const titleAlt = normalizeTitle(resource.title);

  return {
    provider: 'ani' as const,
    providerId: resource.providerId,
    href: resource.href,
    title: resource.title,
    titleAlt,
    type: resource.type,
    size: resource.size,
    magnet: resource.magnet,
    tracker: resource.tracker,
    // Convert to UTC+8
    createdAt: new Date(resource.createdAt),
    fetchedAt: new Date(now),
    anitomy: resource.type === '動畫' ? JSON.stringify(parse(resource.title)) : undefined,
    fansubId: resource.fansub?.id ? resource.fansub?.id : undefined,
    publisherId: resource.publisher.id,
    isDuplicated: sql`EXISTS (SELECT 1 FROM ${resources} WHERE ${resources.magnet} = ${resource.magnet} OR ${resources.title} = ${resource.title})`
  };
}
