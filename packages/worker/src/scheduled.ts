import { parse } from 'anitomy';
import { Resource, fetchDmhyPage, normalizeTitle } from 'animegarden';

import type { Env } from './types';

import { connect } from './database';
import { updateRefreshTimestamp } from './state';
import { findResourcesFromDB, PrefetchFilter } from './query';

const teams = new Set<number>();
const users = new Set<number>();

export async function refreshResources(env: Env) {
  const now = new Date().toISOString();
  const db = connect(env);

  let sum = 0;
  for (let page = 1; ; page++) {
    const res = await fetchDmhyPage(fetch, { page, retry: 5 });
    if (res.length === 0) {
      throw new Error('Unknown error: fetch 0 resources');
    }

    // Check teams and users
    {
      const curUsers = new Map(
        res
          .map((r) => [+r.publisher.id, r.publisher] as const)
          .filter(([id, _value]) => !users.has(id))
      );
      if (curUsers.size > 0) {
        const list = await db
          .selectFrom('User')
          .select('User.id')
          .where('User.id', 'in', [...curUsers.keys()])
          .execute();
        for (const u of list) {
          users.add(u.id);
          curUsers.delete(u.id);
        }

        if (curUsers.size > 0) {
          await db
            .insertInto('User')
            .ignore()
            .values(
              [...curUsers.values()].map((u) => ({ id: +u.id, name: u.name, provider: 'dmhy' }))
            )
            .execute();

          for (const uid of curUsers.keys()) {
            users.add(uid);
          }
        }
      }
    }
    {
      const curTeams = new Map(
        res
          .filter((r) => r.fansub)
          .map((r) => [+r.fansub!.id, r.fansub!] as const)
          .filter(([id, _value]) => !teams.has(id))
      );
      if (curTeams.size > 0) {
        const list = await db
          .selectFrom('Team')
          .select('Team.id')
          .where('Team.id', 'in', [...curTeams.keys()])
          .execute();
        for (const u of list) {
          teams.add(u.id);
          curTeams.delete(u.id);
        }

        if (curTeams.size > 0) {
          await db
            .insertInto('Team')
            .ignore()
            .values(
              [...curTeams.values()].map((u) => ({ id: +u.id, name: u.name, provider: 'dmhy' }))
            )
            .execute();

          for (const tid of curTeams.keys()) {
            teams.add(tid);
          }
        }
      }
    }

    const query = db
      .insertInto('Resource')
      .ignore()
      .values(res.map((r) => transformResource({ ...r, fetchedAt: now })));

    const result = await query.execute();
    const count = result.reduce((acc, cur) => acc + Number(cur.numInsertedOrUpdatedRows ?? 0), 0);

    if (count === 0) break;
    sum += count;
    console.log(`There are ${count} resources inserted`);
  }

  if (sum > 0) {
    await updateRefreshTimestamp(env);

    await Promise.all(
      PrefetchFilter.map(async (filter) => {
        await findResourcesFromDB.remove(env, filter);
        await findResourcesFromDB(env, filter);
      })
    );
  } else {
    console.log(`The resource list is latest`);

    await Promise.all(
      PrefetchFilter.map(async (filter) => {
        const external = findResourcesFromDB.external!;
        const cached = await external.get.bind(findResourcesFromDB)([env, filter]);
        if (cached) {
          await external.set.bind(findResourcesFromDB)([env, filter], cached);
        }
      })
    );
  }

  return { count: sum };
}

export async function fixResources(env: Env, from: number, to: number) {
  const now = new Date();
  const db = connect(env);

  const logs: Array<
    | { type: 'rename'; id: number; from: string; to: string }
    | { type: 'delete'; id: number; title: string }
  > = [];

  let minId = -1;
  let maxId = -1;
  const all = new Map<number, ReturnType<typeof transformResource>>();
  for (let page = from; page <= to; page++) {
    const res = await fetchDmhyPage(fetch, { page, retry: 5 });
    const resources = res.map((r) => transformResource({ ...r, fetchedAt: now.toISOString() }));
    if (resources.length === 0) {
      throw new Error('Failed fetching dmhy resources list');
    }

    for (const r of resources) {
      minId = minId !== -1 ? Math.min(minId, r.id) : r.id;
      maxId = maxId !== -1 ? Math.max(maxId, r.id) : r.id;
      all.set(r.id, r);
    }

    const rows = await db
      .selectFrom('Resource')
      .select(['id', 'magnet', 'title'])
      .where(
        'id',
        'in',
        resources.map((r) => r.id)
      )
      .execute();
    for (const row of rows) {
      const latest = all.get(row.id);
      if (!latest) continue;
      if (latest.title !== row.title || latest.magnet !== row.magnet) {
        const query = db
          .updateTable('Resource')
          .set(() => ({
            title: latest.title,
            titleAlt: normalizeTitle(latest.title),
            magnet: latest.magnet,
            size: latest.size,
            fetchedAt: now
          }))
          .where('Resource.id', '=', latest.id);
        await query.execute();
        logs.push({ type: 'rename', id: latest.id, from: row.title, to: latest.title });
      }
    }
  }

  // Mark unknown resource deleted
  if (minId !== -1 && maxId !== -1) {
    const rows = await db
      .selectFrom('Resource')
      .select(['id', 'title'])
      .where('isDeleted', '=', 0)
      .where('id', '>=', minId)
      .where('id', '<=', maxId)
      .execute();
    const deleted = rows.filter((row) => !all.has(row.id));
    if (deleted.length > 0) {
      await db
        .updateTable('Resource')
        .set(() => ({ isDeleted: 1 }))
        .where(
          'id',
          'in',
          deleted.map((row) => row.id)
        )
        .execute();
      logs.push(...deleted.map((r) => ({ type: 'delete', id: r.id, title: r.title }) as const));
    }
  }

  return { logs };
}

function transformResource(resource: Resource) {
  const lastHref = resource.href.split('/').at(-1);
  if (!lastHref) throw new Error(`Parse error: ${resource.title} (${resource.href})`);

  const matchId = /^(\d+)/.exec(lastHref);
  if (!matchId) throw new Error(`Parse error: ${resource.title} (${resource.href})`);

  const id = +matchId[1];

  const titleAlt = normalizeTitle(resource.title);

  return {
    id,
    href: lastHref,
    title: resource.title,
    titleAlt,
    type: resource.type,
    size: resource.size,
    magnet: resource.magnet,
    // Convert to UTC+8
    createdAt: toShanghai(new Date(resource.createdAt)),
    fetchedAt: toShanghai(new Date(resource.fetchedAt)),
    anitomy: resource.type === '動畫' ? JSON.stringify(parse(resource.title)) : undefined,
    fansubId: resource.fansub?.id ? +resource.fansub?.id : undefined,
    publisherId: +resource.publisher.id,
    provider: resource.provider
  };
}

function toShanghai(date: Date) {
  const offset = -480 - new Date().getTimezoneOffset();
  return new Date(date.getTime() + offset * 60 * 1000);
}
