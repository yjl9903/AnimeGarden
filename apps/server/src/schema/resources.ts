import type { ParseResult } from 'anipar';

import { sql } from 'drizzle-orm';
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

import { tsVector } from './drizzle/index.ts';

import { providerEnum } from './providers.ts';

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
    const liveRootCondition = sql`${t.isDeleted} = false AND ${t.duplicatedId} IS NULL`;

    return [
      uniqueIndex('unique_resources_provider_id').on(t.provider, t.providerId),
      index('resources_title_index').on(t.title),
      index('resources_title_alt_index').on(t.titleAlt),
      index('resources_magnet_index').on(t.magnet),
      index('resources_publisher_id_index').on(t.publisherId),
      index('resources_fansub_id_index').on(t.fansubId),
      index('resources_subject_id_index').on(t.subjectId),
      index('resources_sort_by_created_at').on(t.createdAt.desc()),
      index('resources_title_search_index').using('gin', t.titleSearch),
      index('resources_live_created_at_index').on(t.createdAt.desc()).where(liveRootCondition),
      index('resources_live_title_alt_trgm_index')
        .using('gin', t.titleAlt.op('gin_trgm_ops'))
        .where(liveRootCondition),
      index('resources_live_subject_created_at_index')
        .on(t.subjectId, t.createdAt.desc())
        .where(sql`${liveRootCondition} AND ${t.subjectId} IS NOT NULL`),
      index('resources_live_type_created_at_index')
        .on(t.type, t.createdAt.desc())
        .where(liveRootCondition),
      index('resources_live_fansub_created_at_index')
        .on(t.fansubId, t.createdAt.desc())
        .where(sql`${liveRootCondition} AND ${t.fansubId} IS NOT NULL`),
      index('resources_live_publisher_created_at_index')
        .on(t.publisherId, t.createdAt.desc())
        .where(liveRootCondition),
      index('resources_live_title_search_index')
        .using('gin', t.titleSearch)
        .where(liveRootCondition),
      index('resources_live_title_created_at_index')
        .on(t.title, t.createdAt)
        .where(liveRootCondition),
      index('resources_live_magnet_created_at_index')
        .on(t.magnet, t.createdAt)
        .where(liveRootCondition),
      index('resources_duplicated_id_not_null_index')
        .on(t.duplicatedId)
        .where(sql`${t.duplicatedId} IS NOT NULL`)
    ];
  }
);
