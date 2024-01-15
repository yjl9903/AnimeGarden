import type MeiliSearch from 'meilisearch';

import type { Database } from '../connection';

import { insertResourceDocuments } from '../meilisearch';

export async function syncResourcesToMeili(database: Database, meili: MeiliSearch) {
  const res = await database.query.resources.findMany({
    offset: 0,
    limit: 1000,
    orderBy: (t, { desc }) => [desc(t.createdAt)]
  });
  await insertResourceDocuments(meili, res);
  return { count: res.length };
}
