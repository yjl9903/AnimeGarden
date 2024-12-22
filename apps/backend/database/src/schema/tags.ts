import { pgTable, serial, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

export const tags = pgTable(
  'tags',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 256 }).unique().notNull()
  },
  (t) => {
    return {
      uniqueName: uniqueIndex('unique_tags_name').on(t.name)
    };
  }
);
