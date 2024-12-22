import {
  boolean,
  integer,
  json,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar
} from 'drizzle-orm/pg-core';

export const subjects = pgTable(
  'subjects',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 256 }).unique().notNull(),
    bgmId: integer('bangumi_id'),
    keywords: json('keywords').$type<string[]>().notNull(),
    activedAt: timestamp('actived_at', { withTimezone: true }).notNull(),
    isArchived: boolean('is_archived').default(false)
  },
  (t) => {
    return {
      uniqueName: uniqueIndex('unique_subjects_name').on(t.name)
    };
  }
);
