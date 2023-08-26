import { parse } from 'anitomy';
import { Resource, fetchDmhyPage, normalizeTitle } from 'animegarden';

import type { Env } from './types';

import { connect } from './database';
import { updateRefreshTimestamp } from './state';
import { findResourcesFromDB, PrefetchFilter } from './query';

const teams = new Set<number>();
const users = new Set<number>();

export async function handleScheduled(env: Env) {
  const db = connect(env);

  let sum = 0;
  for (let page = 1; ; page++) {
    const res = await fetchDmhyPage(fetch, { page, retry: 5 });

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
          .where('id', 'in', [...curUsers.keys()])
          .execute();
        for (const u of list) {
          users.add(u.id);
          curUsers.delete(u.id);
        }

        await db
          .insertInto('User')
          .values([...curUsers.values()].map((u) => ({ id: +u.id, name: u.name })))
          .execute();

        for (const uid of curUsers.keys()) {
          users.add(uid);
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
          .where('id', 'in', [...curTeams.keys()])
          .execute();
        for (const u of list) {
          teams.add(u.id);
          curTeams.delete(u.id);
        }

        await db
          .insertInto('Team')
          .values([...curTeams.values()].map((u) => ({ id: +u.id, name: u.name })))
          .execute();

        for (const tid of curTeams.keys()) {
          teams.add(tid);
        }
      }
    }

    const result = await db
      .insertInto('Resource')
      .onConflict((oc) => oc.column('id').doNothing())
      .values(res.map(transformResource))
      .execute();
    // const { count } = await prisma.resource.createMany({
    //   data: res.map(transformResource),
    //   skipDuplicates: true
    // });
    const count = result.reduce((acc, cur) => acc + Number(cur.numInsertedOrUpdatedRows ?? 0), 0);

    if (count === 0) break;
    sum += count;
    console.log(`There are ${count} resources inserted`);
  }

  if (sum > 0) {
    await updateRefreshTimestamp(env);
  }

  await Promise.all(
    PrefetchFilter.map(async (filter) => {
      await findResourcesFromDB.remove(env, filter);
      await findResourcesFromDB(env, filter);
    })
  );

  return { count: sum };
}

export function transformResource(resource: Resource) {
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
    anitomy: resource.type === '動畫' ? (parse(resource.title) as any) : undefined,
    fansubId: resource.fansub?.id ? +resource.fansub?.id : undefined,
    publisherId: +resource.publisher.id
  };
}

function toShanghai(date: Date) {
  const offset = -480 - new Date().getTimezoneOffset();
  return new Date(date.getTime() + offset * 60 * 1000);
}
