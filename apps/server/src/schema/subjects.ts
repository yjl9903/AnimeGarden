import type { DatabaseSubject } from 'bgmx';

import { pgTable, json, integer, boolean, varchar, timestamp } from 'drizzle-orm/pg-core';

export const subjects = pgTable(
  'subjects',
  {
    id: integer('bangumi_id').primaryKey(),
    name: varchar('name', { length: 256 }).notNull(),
    search: json('search').$type<DatabaseSubject['search']>().notNull(),
    activedAt: timestamp('actived_at', { withTimezone: true }),
    isArchived: boolean('is_archived').notNull().default(true)
  },
  (_t) => {
    return [];
  }
);
