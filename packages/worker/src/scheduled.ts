import { makeDatabase } from './database';
import type { Env } from './types';

import { fetchPage } from 'animegarden';

export async function handleScheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  const database = makeDatabase(env.database);
  for (let page = 1; ; page++) {
    const res = await fetchPage({ page, retry: 5 });
    const query = database.insertInto('resource').values(
      res.map((r) => ({
        title: r.title,
        href: r.href,
        type: r.type,
        magnet: r.magnet,
        size: r.size,
        createdAt: new Date(r.createdAt).getTime(),
        fansub: r.fansub ? +r.fansub.id : undefined,
        publisher: +r.publisher.id
      }))
    );
    const insert = await query.execute();
    const inserted = insert.reduce((acc, r) => acc + (r.numInsertedOrUpdatedRows ?? 0n), 0n);
    if (inserted === 0n) {
      break;
    }
  }
}
