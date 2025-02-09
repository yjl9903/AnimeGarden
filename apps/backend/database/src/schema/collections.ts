import { json, pgTable, serial, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import type { CollectionFilter } from '@animegarden/client';

export const collections = pgTable(
  'collections',
  {
    id: serial('id').primaryKey(),
    hash: varchar('hash', { length: 64 }).notNull(),
    name: varchar('name', { length: 64 }).notNull().default(''),
    authorization: varchar('user', { length: 64 }).notNull(),
    filters: json('filters').$type<CollectionFilter<true, false, {}>[]>().notNull().default([]),
    createdAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => {
    return {
      uniqueHash: uniqueIndex('unique_collections_hash').on(t.hash)
    };
  }
);
