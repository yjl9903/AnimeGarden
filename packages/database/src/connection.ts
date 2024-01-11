import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import { users } from './schema/user';
import { teams } from './schema/team';
import { resources } from './schema/resource';

export interface DatabaseConnectionConfig extends postgres.Options<{}> {}

export function connectDatabase(
  uri: string | postgres.Options<{}>,
  options?: postgres.Options<{}>
) {
  const queryClient = typeof uri === 'string' ? postgres(uri, options) : postgres(uri);
  return {
    connection: queryClient,
    database: drizzle(queryClient, { schema: { resources, users, teams } })
  };
}
