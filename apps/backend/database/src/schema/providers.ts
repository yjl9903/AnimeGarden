import { boolean, pgEnum, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const providerEnum = pgEnum('resources_provider', ['dmhy', 'moe', 'ani']);

export const providers = pgTable(
  'providers',
  {
    id: providerEnum('id'),
    name: varchar('name', { length: 32 }).notNull(),
    refreshedAt: timestamp('refreshed_at', { withTimezone: true }).notNull(),
    isActive: boolean('is_active').default(true)
  }
);
