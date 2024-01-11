import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';

import { providerEnum } from './provider';

export const teams = pgTable(
  'teams',
  {
    id: serial('id').primaryKey(),
    provider: providerEnum('provider_type').notNull(),
    providerId: varchar('provider_id', { length: 256 }).notNull(),
    name: varchar('name', { length: 256 }).notNull()
  },
  (teams) => {
    return {};
  }
);
