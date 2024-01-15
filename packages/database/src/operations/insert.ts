import MeiliSearch from 'meilisearch';
import { parse } from 'anitomy';
import { normalizeTitle, type FetchedResource } from 'animegarden';

import type { Database } from '../connection';
import type { NewUser, NewTeam, NewResource, Resource } from '../schema';

import { users } from '../schema/user';
import { teams } from '../schema/team';
import { resources } from '../schema/resource';

export async function insertUsers(database: Database, newUsers: NewUser[]) {
  return await database
    .insert(users)
    .values(newUsers)
    .onConflictDoNothing()
    .returning({ id: users.id });
}

export async function insertTeams(database: Database, newTeams: NewTeam[]) {
  return await database
    .insert(teams)
    .values(newTeams)
    .onConflictDoNothing()
    .returning({ id: teams.id });
}

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
  await meili.index('resources').addDocuments(docs);

  return data;
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
