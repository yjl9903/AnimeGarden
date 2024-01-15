import { fetchDmhyPage } from '@animegarden/scraper';

import {
  insertUsers,
  insertTeams,
  insertDmhyResources,
  updateRefreshTimestamp
} from '@animegarden/database';

import { storage } from '../storage';
import { database } from '../database';
import { meiliSearch } from '../meilisearch';
import { logger as rootLogger } from '../logger';

const logger = rootLogger.forkIntegrationLogger('dmhy');

export async function refreshDmhyResources() {
  let sum = 0;
  for (let page = 1; ; page++) {
    const res = await fetchDmhyPage(fetch, { page, retry: 5 });
    if (res.length === 0) {
      throw new Error('Unknown error: fetch 0 resources');
    }

    // Insert users and teams
    {
      const curUsers = new Map(res.map((r) => [r.publisher.id, r.publisher] as const));
      await insertUsers(
        database,
        [...curUsers.values()].map((u) => ({
          name: u.name,
          provider: 'dmhy',
          providerId: u.id
        }))
      );
    }
    {
      const curTeams = new Map(
        res.filter((r) => r.fansub).map((r) => [r.fansub!.id, r.fansub!] as const)
      );
      await insertTeams(
        database,
        [...curTeams.values()].map((u) => ({
          name: u.name,
          provider: 'dmhy',
          providerId: u.id
        }))
      );
    }

    const result = await insertDmhyResources(database, meiliSearch, res);
    const count = result.length;

    if (count === 0) break;
    sum += count;
    logger.info(`There are ${count} resources inserted`);
  }

  if (sum > 0) {
    await updateRefreshTimestamp(storage);

    // await Promise.all(
    //   PrefetchFilter.map(async (filter) => {
    //     await findResourcesFromDB.remove(env, filter);
    //     await findResourcesFromDB(env, filter);
    //   })
    // );
  } else {
    logger.info(`The resource list is latest`);

    // await Promise.all(
    //   PrefetchFilter.map(async (filter) => {
    //     const external = findResourcesFromDB.external!;
    //     const cached = await external.get.bind(findResourcesFromDB)([env, filter]);
    //     if (cached) {
    //       await external.set.bind(findResourcesFromDB)([env, filter], cached);
    //     }
    //   })
    // );
  }

  return { count: sum };
}

// export async function fixResources(env: Env, from: number, to: number) {
//   const now = new Date();
//   const db = connect(env);

//   const logs: Array<
//     | { type: 'rename'; id: number; from: string; to: string }
//     | { type: 'delete'; id: number; title: string }
//   > = [];

//   let minId = -1;
//   let maxId = -1;
//   const all = new Map<number, ReturnType<typeof transformResource>>();
//   for (let page = from; page <= to; page++) {
//     const res = await fetchDmhyPage(fetch, { page, retry: 5 });
//     const resources = res.map((r) => transformResource({ ...r, fetchedAt: now.toISOString() }));
//     if (resources.length === 0) {
//       throw new Error('Failed fetching dmhy resources list');
//     }

//     for (const r of resources) {
//       minId = minId !== -1 ? Math.min(minId, r.id) : r.id;
//       maxId = maxId !== -1 ? Math.max(maxId, r.id) : r.id;
//       all.set(r.id, r);
//     }

//     const rows = await db
//       .selectFrom('Resource')
//       .select(['id', 'magnet', 'title'])
//       .where(
//         'id',
//         'in',
//         resources.map((r) => r.id)
//       )
//       .execute();
//     for (const row of rows) {
//       const latest = all.get(row.id);
//       if (!latest) continue;
//       if (latest.title !== row.title || latest.magnet !== row.magnet) {
//         const query = db
//           .updateTable('Resource')
//           .set(() => ({
//             title: latest.title,
//             titleAlt: normalizeTitle(latest.title),
//             magnet: latest.magnet,
//             size: latest.size,
//             fetchedAt: now
//           }))
//           .where('Resource.id', '=', latest.id);
//         await query.execute();
//         logs.push({ type: 'rename', id: latest.id, from: row.title, to: latest.title });
//       }
//     }
//   }

//   // Mark unknown resource deleted
//   if (minId !== -1 && maxId !== -1) {
//     const rows = await db
//       .selectFrom('Resource')
//       .select(['id', 'title'])
//       .where('isDeleted', '=', 0)
//       .where('id', '>=', minId)
//       .where('id', '<=', maxId)
//       .execute();
//     const deleted = rows.filter((row) => !all.has(row.id));
//     if (deleted.length > 0) {
//       await db
//         .updateTable('Resource')
//         .set(() => ({ isDeleted: 1 }))
//         .where(
//           'id',
//           'in',
//           deleted.map((row) => row.id)
//         )
//         .execute();
//       logs.push(...deleted.map((r) => ({ type: 'delete', id: r.id, title: r.title }) as const));
//     }
//   }

//   return { logs };
// }
