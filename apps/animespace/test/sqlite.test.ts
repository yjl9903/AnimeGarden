import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';

import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import { filters } from '../src/sqlite/animegarden.ts';
import { loadSpace } from '../src/system/space.ts';
import { openDatabase } from '../src/sqlite/connect.ts';
import { MetadataKey, getMetadata } from '../src/sqlite/metadata.ts';

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe('sqlite migration', () => {
  it('runs migration on first open', async () => {
    const root = await createTempSpace();
    const space = await loadSpace(root);
    const now = new Date('2026-01-01T00:00:00.000Z');

    const opened = await openDatabase(space);
    const version = await getMetadata(opened.database, MetadataKey.SCHEMA_VERSION, 0);

    expect(version.ok).toBe(true);
    expect(version.ok && version.value).toBe(1);

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

    expect(rows).toHaveLength(1);

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

    expect(secondVersion.ok).toBe(true);
    expect(secondVersion.ok && secondVersion.value).toBe(1);

    const secondRows = await second.database.select().from(filters).execute();
    expect(secondRows.some((row) => row.key === 'migration-reopen-1')).toBe(true);

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

    expect(thirdRows.map((row) => row.key).sort()).toEqual([
      'migration-reopen-1',
      'migration-reopen-2'
    ]);

    third.client.close();
  });
});

async function createTempSpace() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'animespace-migration-'));
  roots.push(root);
  await writeFile(path.join(root, 'anime.yaml'), '{}\n');
  return root;
}
