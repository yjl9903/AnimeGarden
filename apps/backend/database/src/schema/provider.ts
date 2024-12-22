import { pgEnum } from 'drizzle-orm/pg-core';

export const providerEnum = pgEnum('resources_provider', ['dmhy', 'moe', 'ani']);
