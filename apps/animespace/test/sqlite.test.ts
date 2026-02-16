import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import { filters } from '../src/sqlite/animegarden.ts';
import { loadSpace } from '../src/system/space.ts';
import { openDatabase } from '../src/sqlite/connect.ts';
import { MetadataKey, getMetadata } from '../src/sqlite/metadata.ts';

import { createAnimeSpaceTestKit } from './helpers/animespace.ts';

const kit = createAnimeSpaceTestKit();

afterEach(async () => {
  await kit.cleanup();
});

describe('sqlite migration', () => {
  it('runs migration on first open', async () => {
    const root = await createTempSpace();
    const space = await loadSpace(root);
    const now = new Date('2026-01-01T00:00:00.000Z');

    const opened = await openDatabase(space);
    const version = await getMetadata(opened.database, MetadataKey.SCHEMA_VERSION, 0);

    expect(version).toMatchInlineSnapshot(`
      {
        "ok": true,
        "value": 1,
      }
    `);

    await opened.database
      .insert(filters)
      .values({
        key: 'migration-first-open',
        filter: {},
        createdAt: now,
        fetchedAt: now
      })
      .execute();

    const rows = await opened.database
      .select()
      .from(filters)
      .where(eq(filters.key, 'migration-first-open'))
      .execute();

    expect(rows.map((row) => row.key)).toMatchInlineSnapshot(`
      [
        "migration-first-open",
      ]
    `);

    opened.client.close();
  });

  it('does not clear existing data across repeated openDatabase calls', async () => {
    const root = await createTempSpace();
    const space = await loadSpace(root);
    const now = new Date('2026-01-02T00:00:00.000Z');

    const first = await openDatabase(space);
    await first.database
      .insert(filters)
      .values({
        key: 'migration-reopen-1',
        filter: {},
        createdAt: now,
        fetchedAt: now
      })
      .execute();
    first.client.close();

    const second = await openDatabase(space);
    const secondVersion = await getMetadata(second.database, MetadataKey.SCHEMA_VERSION, 0);

    expect(secondVersion).toMatchInlineSnapshot(`
      {
        "ok": true,
        "value": 1,
      }
    `);

    const secondRows = await second.database.select().from(filters).execute();
    expect(secondRows.map((row) => row.key)).toMatchInlineSnapshot(`
      [
        "migration-reopen-1",
      ]
    `);

    await second.database
      .insert(filters)
      .values({
        key: 'migration-reopen-2',
        filter: {},
        createdAt: now,
        fetchedAt: now
      })
      .execute();
    second.client.close();

    const third = await openDatabase(space);
    const thirdRows = await third.database.select().from(filters).execute();

    expect(thirdRows.map((row) => row.key).sort()).toMatchInlineSnapshot(`
      [
        "migration-reopen-1",
        "migration-reopen-2",
      ]
    `);

    third.client.close();
  });
});

async function createTempSpace() {
  return await kit.createTempRoot({ prefix: 'animespace-migration-', yaml: '{}\n' });
}
