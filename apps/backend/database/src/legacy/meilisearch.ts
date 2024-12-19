import type { Resource } from './schema';

import { MeiliSearch } from 'meilisearch';

export { MeiliSearch };

export function connectMeiliSearch(host: string, key: string): MeiliSearch {
  return new MeiliSearch({
    host,
    apiKey: key
  });
}

export async function insertResourceDocuments(client: MeiliSearch, resources: Resource[]) {
  const resp = await client.index('resources').addDocuments(
    resources
      .filter((r) => !r.isDeleted)
      .map((d) => ({
        ...d,
        // Map to number, used for lt or gt
        createdAt: d.createdAt!.getTime(),
        fetchedAt: d.fetchedAt!.getTime()
      }))
  );
  const deleted = resources.filter((r) => r.isDeleted);
  if (deleted.length > 0) {
    await client.index('resources').deleteDocuments(deleted.map((r) => r.id));
  }
  return resp;
}
