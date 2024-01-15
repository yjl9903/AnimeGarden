import { connectMeiliSearch } from '@animegarden/database';

export const MEILI_URL = process.env.MEILI_URL;
export const MEILI_KEY = process.env.MEILI_KEY;

if (!MEILI_URL || !MEILI_KEY) {
  console.log(`Can not find meilisearch connection string`);
  process.exit(1);
}

export const meiliSearch = connectMeiliSearch(MEILI_URL, MEILI_KEY);
