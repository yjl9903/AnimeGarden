import { syncResourcesToMeili } from '@animegarden/database';

import { database } from '../database';
import { meiliSearch } from '../meilisearch';

export async function syncDocuments(offset = 0, limit = 1000) {
  return await syncResourcesToMeili(database, meiliSearch, offset, limit);
}
