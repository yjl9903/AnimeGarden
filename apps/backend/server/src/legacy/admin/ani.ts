import { fetchLastestANi } from '@animegarden/scraper';
import { insertANiResources, updateANiResources } from '@animegarden/database';

import { database } from '../database';
import { meiliSearch } from '../meilisearch';
import { logger as rootLogger } from '../logger';

const logger = rootLogger.forkIntegrationLogger('ani');

export async function refreshANiResources() {
  const res = await fetchLastestANi(fetch, { retry: 5 });
  if (res.length === 0) {
    throw new Error('Unknown error: fetch 0 resources');
  }

  const result = await insertANiResources(database, meiliSearch, res);
  const sum = result.length;

  if (sum > 0) {
    logger.info(`Fetch ${sum} ani resources`);
  } else {
    logger.info(`The ani resource list is latest`);
  }

  return { provider: 'ani', count: sum };
}

export async function fixANiResources(from: number, to: number) {
  const resp = await updateANiResources(database, meiliSearch, from, to);
  return { provider: 'ani', logs: resp };
}
