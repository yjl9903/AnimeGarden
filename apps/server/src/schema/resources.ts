import type { ParseResult } from 'anipar';

import {
  bigint,
  boolean,
  index,
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from 'drizzle-orm/pg-core';

import { tsVector } from './drizzle';

import { providerEnum } from './providers';

export const resources = pgTable(
  'resources',
  {
    id: serial('id').primaryKey(),
    provider: providerEnum('provider_name').notNull(),
    providerId: varchar('provider_id', { length: 128 }).notNull(),
    // Titles
    title: varchar('title', { length: 1024 }).notNull(),
    titleAlt: varchar('title_alt', { length: 1024 }).notNull(),
    titleSearch: tsVector('title_search').notNull(),
    href: text('href').notNull(),
    type: varchar('type', { length: 64 }).notNull(),
    // Magnet
    magnet: varchar('magnet', { length: 256 }).notNull(),
    tracker: text('tracker').notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    // Timestamp
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    // Authors
    publisherId: integer('publisher_id').notNull(),
    fansubId: integer('fansub_id'),
    // Duplicated resources
    duplicatedId: integer('duplicated_id'),
    // Metadata
    subjectId: integer('subject_id'),
    metadata: json('metadata').$type<{ anipar?: ParseResult }>(),
    // Logic deletion
    isDeleted: boolean('is_deleted').default(false)
  },
  (t) => {
    return [
      uniqueIndex('unique_resources_provider_id').on(t.provider, t.providerId),
      index('resources_title_index').on(t.title),
      index('resources_title_alt_index').on(t.titleAlt),
      index('resources_magnet_index').on(t.magnet),
      index('resources_publisher_id_index').on(t.publisherId),
      index('resources_fansub_id_index').on(t.fansubId),
      index('resources_subject_id_index').on(t.subjectId),
      index('resources_sort_by_created_at').on(t.createdAt.desc()),
      index('resources_title_search_index').using('gin', t.titleSearch)
    ];
  }
);
