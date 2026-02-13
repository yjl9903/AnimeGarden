import { sqliteTable, integer, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { Resource, ResolvedFilterOptions } from '@animegarden/client';

// Fetched resources from animegarden
export const resources = sqliteTable(
  'animegarden_resources',
  {
    id: integer('id').primaryKey().notNull(),
    provider: text('provider_name').notNull(),
    providerId: text('provider_id').notNull(),
    // Titles
    title: text('title').notNull(),
    href: text('href').notNull(),
    type: text('type').notNull(),
    // Magnet
    magnet: text('magnet').notNull(),
    tracker: text('tracker').notNull(),
    size: integer('size').notNull(),
    // Authors
    publisher: text('publisher', { mode: 'json' }).$type<Resource['publisher']>().notNull(),
    fansub: text('fansub', { mode: 'json' }).$type<Resource['fansub']>(),
    // Timestamp
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    // Timestamp fetched to local sqlite
    fetchedAt: integer('fetched_at', { mode: 'timestamp_ms' }).notNull()
  },
  (t) => {
    return [
      uniqueIndex('animegarden_resources_provider_id').on(t.provider, t.providerId),
      index('animegarden_resources_created_at').on(t.createdAt),
      index('animegarden_resources_fetched_at').on(t.fetchedAt)
    ];
  }
);

export type DatabaseResource = typeof resources.$inferSelect;

// Cached Anime Garden search filters
export const filters = sqliteTable('animegarden_filters', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  key: text('key').unique().notNull(),
  filter: text('filter', { mode: 'json' }).$type<ResolvedFilterOptions>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp_ms' }).notNull()
});

export type DatabaseFilter = typeof filters.$inferSelect;

// Cache Anime Garden resources related with a filter
export const filterResources = sqliteTable(
  'animegarden_filter_resources',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    filterId: integer('filter_id').notNull(),
    resourceId: integer('resource_id').notNull()
  },
  (t) => {
    return [
      uniqueIndex('animegarden_filter_resources_filter_id_resource_id').on(t.filterId, t.resourceId)
    ];
  }
);

export type DatabaseFilterResource = typeof filterResources.$inferSelect;
