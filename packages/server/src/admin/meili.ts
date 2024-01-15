import { syncResourcesToMeili } from '@animegarden/database';

import { database } from '../database';
import { meiliSearch } from '../meilisearch';

export async function syncDocuments() {
  return await syncResourcesToMeili(database, meiliSearch);
}
