import { fetchPage } from 'animegarden';

import type { Env } from './types';
import { makePrisma } from './prisma';

const teams = new Set<number>();
const users = new Set<number>();

export async function handleScheduled(env: Env) {
  const prisma = makePrisma(env);

  let sum = 0;
  for (let page = 1; ; page++) {
    const res = await fetchPage({ page, retry: 5 });

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
      data: res.map((r) => ({
        title: r.title,
        href: r.href,
        type: r.type,
        magnet: r.magnet,
        size: r.size,
        // Convert to UTC+8
        createdAt: new Date(r.createdAt).getTime() - 8 * 60 * 60 * 1000,
        fansubId: r.fansub ? +r.fansub.id : undefined,
        publisherId: +r.publisher.id
      })),
      skipDuplicates: true
    });

    if (count === 0) break;
    sum += count;
    console.log(`There are ${count} resources inserted`);
  }

  return { count: sum };
}
