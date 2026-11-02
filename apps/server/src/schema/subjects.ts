import { pgTable, json, integer, boolean, varchar, timestamp } from 'drizzle-orm/pg-core';

import type { DatabaseSubject } from 'bgmx';

import type { SubjectMetadata } from '@animegarden/shared';

type BgmSubjectSearch = DatabaseSubject['search'];

/** Public schema type that keeps bgmx's private search type out of generated declarations. */
export interface SubjectSearch extends BgmSubjectSearch {}

export const subjects = pgTable(
  'subjects',
  {
    id: integer('bangumi_id').primaryKey(),
    name: varchar('name', { length: 256 }).notNull(),
    // 提取出来的筛选匹配条件
    search: json('search').$type<SubjectSearch>().notNull(),
    // Nullable until the first successful dynamic synchronization after migration.
    metadata: json('metadata').$type<SubjectMetadata>(),
    activedAt: timestamp('actived_at', { withTimezone: true }),
    isArchived: boolean('is_archived').notNull().default(true)
  },
  (_t) => {
    return [];
  }
);
