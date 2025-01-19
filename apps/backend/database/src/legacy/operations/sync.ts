import type MeiliSearch from 'meilisearch';

import type { Database } from '../connection';

import { insertResourceDocuments } from '../meilisearch';

export async function syncResourcesToMeili(
  database: Database,
  meili: MeiliSearch,
  offset: number,
  limit: number
) {
  const res = await database.query.resources.findMany({
    offset,
    limit,
    orderBy: (t, { desc }) => [desc(t.createdAt)]
  });
  await insertResourceDocuments(meili, res);
  return { count: res.length };
}
