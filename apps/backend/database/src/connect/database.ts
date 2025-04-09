import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import { providers } from '../schema/providers';
import { users, teams } from '../schema/users';
import { tags } from '../schema/tags';
import { subjects } from '../schema/subjects';
import { resources } from '../schema/resources';
import { details } from '../schema/details';
import {
  resourcesRelations,
  userRelations,
  teamRelations,
  subjectRelations
} from '../schema/relations';

export interface ConnectDatabaseOptions extends postgres.Options<{}> {}

export type Database = ReturnType<typeof connectDatabase>['database'];

export function connectDatabase(
  uri: string | postgres.Options<{}>,
  options?: postgres.Options<{}>
) {
  const queryClient = typeof uri === 'string' ? postgres(uri, options) : postgres(uri);
  return {
    connection: queryClient,
    database: drizzle(queryClient, {
      logger: false,
      schema: {
        providers,
        resources,
        details,
        users,
        teams,
        tags,
        subjects,
        resourcesRelations,
        userRelations,
        teamRelations,
        subjectRelations
      }
    })
  };
}
