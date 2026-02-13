import { eq } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { type Result, tryAsync } from '../utils/result';

import type { Database } from './types';

export const enum MetadataKey {
  SCHEMA_VERSION = 'schema_version'
}

export const metadata = sqliteTable('metadata', {
  key: text().primaryKey().notNull(),
  value: text({ mode: 'json' })
});

export async function getMetadata<T>(
  db: Database,
  key: MetadataKey,
  fallback: T
): Promise<Result<T, unknown>> {
  return tryAsync(
    async () =>
      ((await db.select().from(metadata).where(eq(metadata.key, key)).execute())?.[0]
        ?.value as T) ?? fallback
  );
}

export async function setMetadata<T>(
  db: Database,
  key: MetadataKey,
  value: T
): Promise<Result<T, unknown>> {
  return tryAsync(async () => {
    return (
      await db
        .insert(metadata)
        .values({
          key,
          value
        })
        .onConflictDoUpdate({
          target: metadata.key,
          set: {
            value
          }
        })
        .returning()
        .execute()
    )[0]?.value as T;
  });
}
