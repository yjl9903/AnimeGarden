import { Resource } from 'animegarden';
import { MeiliSearch } from 'meilisearch';

export function connectMeiliSearch(host: string, key: string) {
  return new MeiliSearch({
    host,
    apiKey: key
  });
}

export async function insertResource(client: MeiliSearch, resources: Resource[]) {
  const resp = await client.index('resources').addDocuments(resources);
  return resp;
}
