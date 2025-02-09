import { pgTable, json, integer, boolean, varchar, timestamp } from 'drizzle-orm/pg-core';

export const subjects = pgTable(
  'subjects',
  {
    id: integer('bangumi_id').primaryKey(),
    name: varchar('name', { length: 256 }).notNull(),
    keywords: json('keywords').$type<string[]>().notNull(),
    activedAt: timestamp('actived_at', { withTimezone: true }).notNull(),
    isArchived: boolean('is_archived').notNull().default(true)
  },
  (_t) => {
    return {};
  }
);
