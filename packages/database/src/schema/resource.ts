import {
  boolean,
  foreignKey,
  index,
  json,
  pgTable,
  serial,
  text,
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
    providerId: varchar('provider_id', { length: 128 }).notNull(),
    href: varchar('href', { length: 1024 }).notNull(),
    title: varchar('title', { length: 1024 }).notNull(),
    titleAlt: varchar('title_alt', { length: 1024 }).notNull(),
    type: varchar('type', { length: 256 }).notNull(),
    size: varchar('size', { length: 256 }).notNull(),
    magnet: text('magnet').notNull(),
    tracker: text('tracker'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow(),
    anitomy: json('anitomy'),
    fansubId: varchar('fansub_id', { length: 128 }),
    publisherId: varchar('publisher_id', { length: 128 }).notNull(),
    isDeleted: boolean('is_deleted').default(false),
    isDuplicated: boolean('is_duplicated').default(false)
  },
  (t) => {
    return {
      uniqueProviderIndex: uniqueIndex('unique_resource_provider').on(t.provider, t.providerId),
      sortByCreatedAt: index('sort_by_created_at').on(t.createdAt.desc()),
      fansubIndex: index('fansub_index').on(t.fansubId),
      publisherIndex: index('publisher_index').on(t.publisherId),
      publisherReference: foreignKey({
        name: 'resource_publisher_fk',
        columns: [t.provider, t.publisherId],
        foreignColumns: [users.provider, users.providerId]
      }),
      fansubReference: foreignKey({
        name: 'resource_fansub_fk',
        columns: [t.provider, t.fansubId],
        foreignColumns: [teams.provider, teams.providerId]
      })
    };
  }
);
