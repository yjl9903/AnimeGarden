import { type MeiliSearch, connectMeiliSearch } from '@animegarden/database';

import { logger as rootLogger } from './logger';

export const MEILI_URL = process.env.MEILI_URL;
export const MEILI_KEY = process.env.MEILI_KEY;

if (!MEILI_URL || !MEILI_KEY) {
  console.log(`Can not find meilisearch connection string`);
  process.exit(1);
}

export const meiliSearch: MeiliSearch = connectMeiliSearch(MEILI_URL, MEILI_KEY);

export const meiliLogger = rootLogger.forkIntegrationLogger('meilisearch');
