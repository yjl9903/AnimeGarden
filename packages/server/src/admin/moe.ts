import {
  insertMoeResources,
  insertTeams,
  insertUsers,
  updateRefreshTimestamp
} from '@animegarden/database';
import { fetchMoePage } from '@animegarden/scraper';

import { storage } from '../storage';
import { database } from '../database';
import { meiliSearch } from '../meilisearch';
import { logger as rootLogger } from '../logger';

const logger = rootLogger.forkIntegrationLogger('moe');

export async function refreshMoeResources() {
  let sum = 0;
  for (let page = 1; ; page++) {
    const res = await fetchMoePage(fetch, { page, retry: 5 });
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
          provider: 'moe',
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
          provider: 'moe',
          providerId: t.id
        }))
      );
    }

    const result = await insertMoeResources(database, meiliSearch, res);
    const count = result.length;

    if (count === 0) break;
    sum += count;
    logger.info(`There are ${count} moe resources inserted`);
  }

  if (sum > 0) {
    //
  } else {
    logger.info(`The moe resource list is latest`);
  }

  return { count: sum };
}
