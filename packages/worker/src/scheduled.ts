import type { Env } from './types';

import { fetchPage } from 'animegarden';
import { PrismaClient } from '@prisma/client/edge';

export async function handleScheduled(env: Env) {
  const prisma = new PrismaClient();

  const teams = new Set<number>();
  const users = new Set<number>();

  for (let page = 1; ; page++) {
    const res = await fetchPage({ page, retry: 5 });

    // Check teams and users
    for (const r of res) {
      if (!users.has(+r.publisher.id)) {
        const u = await prisma.user.findUnique({
          where: {
            id: +r.publisher.id
          }
        });
        if (u) {
          users.add(u.id);
        } else {
          await prisma.user.create({
            data: {
              id: +r.publisher.id,
              name: r.publisher.name
            }
          });
          users.add(+r.publisher.id);
        }
      }
      if (r.fansub && !teams.has(+r.fansub.id)) {
        const u = await prisma.team.findUnique({
          where: {
            id: +r.fansub.id
          }
        });
        if (u) {
          teams.add(u.id);
        } else {
          await prisma.team.create({
            data: {
              id: +r.fansub.id,
              name: r.fansub.name
            }
          });
          teams.add(+r.fansub.id);
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

    console.log(`There are ${count} resources inserted`);
  }
}
