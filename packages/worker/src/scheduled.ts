import { makeDatabase } from './database';
import type { Env } from './types';

import { fetchPage } from 'animegarden';

export async function handleScheduled(env: Env) {
  const database = makeDatabase(env.database);
  const teams = new Set<number>();
  const users = new Set<number>();

  for (let page = 1; ; page++) {
    const res = await fetchPage({ page, retry: 5 });

    // Check teams and users
    for (const r of res) {
      if (!users.has(+r.publisher.id)) {
        const u = await database
          .selectFrom('user')
          .selectAll()
          .where('id', '=', +r.publisher.id)
          .executeTakeFirst();
        if (u) {
          users.add(u.id);
        } else {
          await database
            .insertInto('user')
            .values({ id: +r.publisher.id, name: r.publisher.name })
            .executeTakeFirst();
          users.add(+r.publisher.id);
        }
      }
      if (r.fansub && !teams.has(+r.fansub.id)) {
        const u = await database
          .selectFrom('team')
          .selectAll()
          .where('id', '=', +r.fansub.id)
          .executeTakeFirst();
        if (u) {
          teams.add(u.id);
        } else {
          await database
            .insertInto('team')
            .values({ id: +r.fansub.id, name: r.fansub.name })
            .executeTakeFirst();
          teams.add(+r.fansub.id);
        }
      }
    }

    const query = database
      .insertInto('resource')
      .values(
        res.map((r) => ({
          title: r.title,
          href: r.href,
          type: r.type,
          magnet: r.magnet,
          size: r.size,
          // Convert to UTC+8
          createdAt: new Date(r.createdAt).getTime() - 8 * 60 * 60 * 1000,
          fansub: r.fansub ? +r.fansub.id : undefined,
          publisher: +r.publisher.id
        }))
      )
      .onConflict((oc) => oc.doNothing());
    const insert = await query.execute();
    const inserted = insert.reduce((acc, r) => acc + (r.numInsertedOrUpdatedRows ?? 0n), 0n);
    if (inserted === 0n) {
      break;
    }

    console.log(`There are ${inserted} resources inserted`);
  }
}
