import { boolean, pgEnum, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

import { SupportProviders } from '@animegarden/client';

export const providerEnum = pgEnum('resources_provider', SupportProviders);

export const providers = pgTable('providers', {
  id: providerEnum('id').notNull(),
  name: varchar('name', { length: 32 }).notNull(),
  refreshedAt: timestamp('refreshed_at', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').default(true).notNull()
});
