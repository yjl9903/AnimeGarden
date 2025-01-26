import { json, pgTable, serial, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import type { ResolvedFilterOptions } from '@animegarden/client';

export type CollectionFilterOptions = Omit<ResolvedFilterOptions, 'page' | 'pageSize'> & {
  name?: string;

  command?: string;
};

export const collections = pgTable(
  'collections',
  {
    id: serial('id').primaryKey(),
    hash: varchar('hash', { length: 64 }).notNull(),
    user: varchar('user', { length: 64 }).notNull(),
    name: varchar('name', { length: 64 }).notNull().default(''),
    filters: json('filters').$type<CollectionFilterOptions[]>().notNull().default([]),
    createdAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => {
    return {
      uniqueHash: uniqueIndex('unique_collections_hash').on(t.hash)
    };
  }
);
