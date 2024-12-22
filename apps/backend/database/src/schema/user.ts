import { pgTable, serial, text, varchar, json, uniqueIndex } from 'drizzle-orm/pg-core';

export interface ProviderInfo {
  providerId: string;

  avatar?: string;
}

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 128 }).unique().notNull(),
    avatar: text('avatar'),
    providers: json('providers').$type<Record<string, ProviderInfo>>().default({})
  },
  (t) => {
    return {
      uniqueName: uniqueIndex('unique_user_name').on(t.name)
    };
  }
);

export const teams = pgTable(
  'teams',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 128 }).unique().notNull(),
    avatar: text('avatar'),
    providers: json('providers').$type<Record<string, ProviderInfo>>().default({})
  },
  (t) => {
    return {
      uniqueName: uniqueIndex('unique_team_name').on(t.name)
    };
  }
);
