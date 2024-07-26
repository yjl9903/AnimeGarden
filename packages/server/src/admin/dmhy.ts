import type { FetchedResource } from 'animegarden';

import { fetchDmhyPage } from '@animegarden/scraper';

import {
  insertUsers,
  insertTeams,
  insertDmhyResources,
  updateDmhyResources
} from '@animegarden/database';

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
          avatar: u.avatar,
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
        [...curTeams.values()].map((t) => ({
          name: t.name,
          avatar: t.avatar,
          provider: 'dmhy',
          providerId: t.id
        }))
      );
    }

    const result = await insertDmhyResources(database, meiliSearch, res);
    const count = result.length;

    if (count === 0) break;
    sum += count;
    logger.info(`There are ${count} dmhy resources inserted`);
  }

  if (sum > 0) {
    logger.info(`Fetch ${sum} dmhy resources`);
    // await updateRefreshTimestamp(storage);
    // await Promise.all(
    //   PrefetchFilter.map(async (filter) => {
    //     await findResourcesFromDB.remove(env, filter);
    //     await findResourcesFromDB(env, filter);
    //   })
    // );
  } else {
    logger.info(`The dmhy resource list is latest`);
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

  return { provider: 'dmhy', count: sum };
}

export async function fixDmhyResources(from: number, to: number) {
  const map = new Map<string, FetchedResource>();
  for (let page = from; page <= to; page++) {
    const res = await fetchDmhyPage(fetch, { page, retry: 5 });
    if (res.length === 0) {
      throw new Error('Failed fetching dmhy resources list');
    }
    for (const r of res) {
      map.set(r.providerId, r);
    }
  }
  const fetched = [...map.values()];
  return await updateDmhyResources(database, fetched);
}
