import MeiliSearch from 'meilisearch';

import { parse } from 'anitomy';
import { and, desc, eq, gt, inArray, lt } from 'drizzle-orm';
import { normalizeTitle, type FetchedResource } from 'animegarden';

import type { Database } from '../connection';
import type { NewResource, Resource } from '../schema';

import { resources } from '../schema/resource';
import { insertResourceDocuments } from '../meilisearch';

export async function insertDmhyResources(
  database: Database,
  meili: MeiliSearch,
  fetchedResources: FetchedResource[]
) {
  const now = new Date();
  const res = fetchedResources.map((r) => transformResource(r, now));

  const data = await database
    .insert(resources)
    .values(res)
    .onConflictDoNothing()
    .returning({ id: resources.id, providerId: resources.providerId });

  const map = new Map(res.map((r) => [r.providerId, r] as const));
  const docs = data
    .map((r) => {
      const item = map.get(r.providerId);
      if (item) {
        // Manually add default fields
        return { id: r.id, isDeleted: false, isDuplicated: false, ...item };
      }
    })
    .filter(Boolean) as Resource[];
  if (docs.length > 0) {
    await insertResourceDocuments(meili, docs);
  }

  return data;
}

export async function updateDmhyResources(database: Database, fetchedResources: FetchedResource[]) {
  const now = new Date();
  const res = fetchedResources.map((r) => transformResource(r, now));

  // Rename
  const logs: Array<{
    operation: 'rename' | 'delete';
    provider: string;
    providerId: string;
    title: string;
  }> = [];
  for (const latest of res) {
    const found = await database.query.resources.findFirst({
      where: and(
        eq(resources.provider, latest.provider),
        eq(resources.providerId, latest.providerId)
      )
    });
    if (!found) {
      continue;
    }
    if (
      found.title !== latest.title ||
      found.magnet !== latest.magnet ||
      found.size !== latest.size
    ) {
      const updated = await database
        .update(resources)
        .set({
          title: latest.title,
          titleAlt: normalizeTitle(latest.title),
          magnet: latest.magnet,
          size: latest.size,
          fetchedAt: now
        })
        .where(
          and(eq(resources.provider, latest.provider), eq(resources.providerId, latest.providerId))
        )
        .returning({
          id: resources.id,
          title: resources.title,
          provider: resources.provider,
          providerId: resources.providerId
        });
      if (updated.length === 1) {
        logs.push({
          operation: 'rename',
          provider: updated[0].provider,
          providerId: updated[0].providerId,
          title: updated[0].title
        });
      }
    }
  }

  // Delete
  const visited = new Set(res.map((r) => r.provider + ':' + r.providerId));
  const minCreatedAt = res.reduce((acc, cur) => {
    return Math.min(acc, new Date(cur.createdAt!).getTime());
  }, Number.MAX_SAFE_INTEGER);
  const maxCreatedAt = res.reduce((acc, cur) => {
    return Math.max(acc, new Date(cur.createdAt!).getTime());
  }, Number.MIN_SAFE_INTEGER);
  const stored = await database
    .select({
      id: resources.id,
      title: resources.title,
      provider: resources.provider,
      providerId: resources.providerId
    })
    .from(resources)
    .where(
      and(
        eq(resources.provider, 'dmhy'),
        eq(resources.isDeleted, false),
        gt(resources.createdAt, new Date(minCreatedAt)),
        lt(resources.createdAt, new Date(maxCreatedAt))
      )
    )
    .orderBy(desc(resources.createdAt), desc(resources.id));
  const deleted = stored.filter((st) => !visited.has(st.provider + ':' + st.providerId));
  if (deleted.length > 0) {
    const resp = await database
      .update(resources)
      .set({ isDeleted: true })
      .where(
        inArray(
          resources.id,
          deleted.map((st) => st.id)
        )
      )
      .returning({
        id: resources.id,
        title: resources.title,
        provider: resources.provider,
        providerId: resources.providerId
      });
    logs.push(
      ...resp.map((r) => ({
        operation: 'delete' as const,
        provider: r.provider,
        providerId: r.providerId,
        title: r.title
      }))
    );
  }

  return logs;
}

function transformResource(resource: FetchedResource, now: Date) {
  const lastHref = resource.href.split('/').at(-1);
  if (!lastHref) throw new Error(`Parse error: ${resource.title} (${resource.href})`);

  const matchId = /^(\d+)/.exec(lastHref);
  if (!matchId) throw new Error(`Parse error: ${resource.title} (${resource.href})`);

  const id = +matchId[1];

  const titleAlt = normalizeTitle(resource.title);

  return <NewResource>{
    provider: 'dmhy',
    providerId: '' + id,
    href: lastHref,
    title: resource.title,
    titleAlt,
    type: resource.type,
    size: resource.size,
    magnet: resource.magnet,
    // Convert to UTC+8
    createdAt: toShanghai(new Date(resource.createdAt)),
    fetchedAt: toShanghai(new Date(now)),
    anitomy: resource.type === '動畫' ? JSON.stringify(parse(resource.title)) : undefined,
    fansubId: resource.fansub?.id ? resource.fansub?.id : undefined,
    publisherId: resource.publisher.id
  };
}

function toShanghai(date: Date) {
  const offset = -480 - new Date().getTimezoneOffset();
  return new Date(date.getTime() + offset * 60 * 1000);
}
