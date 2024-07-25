import { pgTable, serial, text, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { providerEnum } from './provider';

export const teams = pgTable(
  'teams',
  {
    id: serial('id').primaryKey(),
    provider: providerEnum('provider_type').notNull(),
    providerId: varchar('provider_id', { length: 128 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    avatar: text('avatar')
  },
  (t) => {
    return {
      uniqueProviderIndex: uniqueIndex('unique_team_provider').on(t.provider, t.providerId)
    };
  }
);
