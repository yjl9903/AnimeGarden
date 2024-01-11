import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import { users } from './schema/user';
import { teams } from './schema/team';
import { resources } from './schema/resource';

export interface DatabaseConnectionConfig extends postgres.Options<{}> {}

export const connectDatabase = (...args: Parameters<typeof postgres>) => {
  const queryClient = postgres(...args);
  return {
    connection: queryClient,
    db: drizzle(queryClient, { schema: { resources, users, teams } })
  };
};
