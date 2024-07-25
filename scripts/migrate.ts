import 'dotenv/config';

import { eq } from 'drizzle-orm';

import { database } from '../packages/server/src/database';
import { meiliSearch } from '../packages/server/src/meilisearch';
import { resources, insertResourceDocuments } from '../packages/database/src';

const PAGE_SIZE = 1000;

async function update(page: number) {
  const data = await database
    .select()
    .from(resources)
    .offset(page * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .orderBy(resources.id)
    .execute();

  if (data.length === 0) return false;

  console.log(`Updating page ${page}`);

  // Update database
  const tasks: Promise<void>[] = data.map(async (r) => {
    if (!r.magnet || r.tracker) return;
    const [magnet, tracker] = splitOnce(r.magnet, '&');

    await database
      .update(resources)
      .set({ magnet, tracker })
      .where(eq(resources.id, r.id))
      .execute();

    r.magnet = magnet;
    r.tracker = tracker;
  });
  await Promise.all(tasks);

  // Insert meili
  await insertResourceDocuments(meiliSearch, data);

  return true;

  function splitOnce(text: string, separator: string): [string, string] {
    const found = text.indexOf(separator);
    if (found === -1) {
      return [text, ''];
    }
    const first = text.slice(0, found);
    const second = text.slice(found);
    return [first, second];
  }
}

async function main(page: number) {
  while (true) {
    const ok = await update(page);
    if (!ok) {
      break;
    }
    page++;
  }
}

main(0);
