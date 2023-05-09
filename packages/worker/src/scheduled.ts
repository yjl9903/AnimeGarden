import type { Prisma } from '@prisma/client/edge';

import { parse } from 'anitomy';
import { Resource, fetchDmhyPage } from 'animegarden';
import { tradToSimple, fullToHalf } from 'simptrad';

import type { Env } from './types';

import { makePrisma } from './prisma';
import { updateRefreshTimestamp } from './state';

const teams = new Set<number>();
const users = new Set<number>();

export async function handleScheduled(env: Env) {
  const prisma = makePrisma(env);

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
        const list = await prisma.user.findMany({ where: { id: { in: [...curUsers.keys()] } } });
        for (const u of list) {
          users.add(u.id);
          curUsers.delete(u.id);
        }
        await prisma.user.createMany({
          data: [...curUsers.values()].map((u) => ({ id: +u.id, name: u.name }))
        });
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
        const list = await prisma.team.findMany({ where: { id: { in: [...curTeams.keys()] } } });
        for (const u of list) {
          teams.add(u.id);
          curTeams.delete(u.id);
        }
        await prisma.team.createMany({
          data: [...curTeams.values()].map((u) => ({ id: +u.id, name: u.name }))
        });
        for (const tid of curTeams.keys()) {
          teams.add(tid);
        }
      }
    }

    const { count } = await prisma.resource.createMany({
      data: res.map(transformResource),
      skipDuplicates: true
    });

    if (count === 0) break;
    sum += count;
    console.log(`There are ${count} resources inserted`);
  }

  if (sum > 0) {
    await updateRefreshTimestamp(env);
  }

  return { count: sum };
}

export function transformResource(resource: Resource) {
  const lastHref = resource.href.split('/').at(-1);
  if (!lastHref) throw new Error(`Parse error: ${resource.title} (${resource.href})`);

  const matchId = /^(\d+)/.exec(lastHref);
  if (!matchId) throw new Error(`Parse error: ${resource.title} (${resource.href})`);

  const id = +matchId[1];

  const titleAlt = fullToHalf(tradToSimple(resource.title));

  return {
    id,
    href: lastHref,
    title: resource.title,
    titleAlt,
    type: resource.type,
    size: resource.size,
    magnet: resource.magnet,
    // Convert to UTC+8
    createdAt: new Date(new Date(resource.createdAt).getTime() - 8 * 60 * 60 * 1000),
    // createdAt: new Date(resource.createdAt),
    anitomy:
      resource.type === '動畫'
        ? (parse(resource.title) as Prisma.JsonObject | undefined)
        : undefined,
    fansubId: resource.fansub?.id ? +resource.fansub?.id : undefined,
    publisherId: +resource.publisher.id
  };
}
