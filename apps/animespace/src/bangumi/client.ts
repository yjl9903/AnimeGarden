import { BgmClient } from 'bgmc';

import type { SearchSubject, UserCollection } from './types.ts';

export function makeBgmClient() {
  return new BgmClient();
}

export async function searchAnimeSubjects(
  client: BgmClient,
  keyword: string
): Promise<SearchSubject[]> {
  const result = await client.searchSubjects({
    query: { limit: 20, offset: 0 },
    requestBody: {
      keyword,
      filter: {
        type: [2]
      }
    }
  });

  return result.data ?? [];
}

export async function fetchUserCollections(
  client: BgmClient,
  uid: string,
  collectionType: 1 | 2 | 3 | 4 | 5
) {
  const items: UserCollection[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const page = await client.getCollections(uid, {
      subject_type: 2,
      type: collectionType,
      limit,
      offset
    });

    items.push(...page.data);
    offset += page.data.length;

    if (offset >= page.total || page.data.length === 0) {
      break;
    }
  }

  return items;
}
