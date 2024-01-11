import {
  boolean,
  index,
  integer,
  json,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar
} from 'drizzle-orm/pg-core';

import { providerEnum } from './provider';
import { users } from './user';
import { teams } from './team';

export const resources = pgTable(
  'resources',
  {
    id: serial('id').primaryKey(),
    provider: providerEnum('provider_type').notNull(),
    providerId: varchar('provider_id', { length: 256 }).notNull(),
    href: varchar('href', { length: 256 }).notNull(),
    title: varchar('title', { length: 256 }).notNull(),
    titleAlt: varchar('title_alt', { length: 256 }).notNull(),
    type: varchar('type', { length: 256 }).notNull(),
    size: varchar('size', { length: 256 }).notNull(),
    magnet: varchar('magnet', { length: 256 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow(),
    anitomy: json('anitomy'),
    fansubId: integer('fansub_id')
      .notNull()
      .references(() => teams.id),
    publisherId: integer('publisher_id').references(() => users.id),
    isDeleted: boolean('is_deleted').default(false),
    isDuplicated: boolean('is_duplicated').default(false)
  },
  (t) => {
    return {
      uniqueProviderIndex: uniqueIndex('provider_type_id').on(t.provider, t.providerId),
      sortByCreatedAt: index('sort_by_created_at').on(t.createdAt).desc(),
      fansubIndex: index('fansub_index').on(t.fansubId),
      publisherIndex: index('publisher_index').on(t.publisherId)
    };
  }
);
