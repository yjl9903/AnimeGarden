import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import { providers } from '../schema/providers';
import { users, teams } from '../schema/users';
import { tags } from '../schema/tags';
import { subjects } from '../schema/subjects';
import { resources } from '../schema/resources';
import { details } from '../schema/details';
import { telegramMessages } from '../schema/telegram';
import {
  resourcesRelations,
  userRelations,
  teamRelations,
  subjectRelations
} from '../schema/relations';

export interface ConnectDatabaseOptions extends postgres.Options<{}> {}

export type SystemProfile = 'cli' | 'server' | 'cron';

export type DatabaseConnection = ReturnType<typeof postgres>;

export type Database = ReturnType<typeof connectDatabase>['database'];

const RESOURCES_SLOW_DATABASE_CONNECTION_OPTIONS = {
  application_name: 'animegarden-server-resources-slow',
  statement_timeout: 60_000,
  lock_timeout: 1_000,
  idle_in_transaction_session_timeout: 15_000
} satisfies NonNullable<ConnectDatabaseOptions['connection']>;

const DATABASE_POOL_OPTIONS = {
  max: 5,
  idle_timeout: 60,
  max_lifetime: 60 * 30
} satisfies ConnectDatabaseOptions;

const DATABASE_PROFILE_CONNECTION_OPTIONS: Record<
  SystemProfile,
  NonNullable<ConnectDatabaseOptions['connection']>
> = {
  cli: {
    application_name: 'animegarden-cli'
  },
  server: {
    application_name: 'animegarden-server',
    statement_timeout: 3_000,
    lock_timeout: 1_000,
    idle_in_transaction_session_timeout: 15_000
  },
  cron: {
    application_name: 'animegarden-cron',
    statement_timeout: 60_000,
    lock_timeout: 5_000,
    idle_in_transaction_session_timeout: 30_000
  }
};

export function getDatabaseConnectOptions(profile: SystemProfile = 'cli'): ConnectDatabaseOptions {
  return {
    ...DATABASE_POOL_OPTIONS,
    connection: {
      ...DATABASE_PROFILE_CONNECTION_OPTIONS[profile]
    }
  };
}

export function getResourcesSlowDatabaseConnectOptions(): ConnectDatabaseOptions {
  return {
    ...DATABASE_POOL_OPTIONS,
    max: 1,
    connection: {
      ...RESOURCES_SLOW_DATABASE_CONNECTION_OPTIONS
    }
  };
}

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
        telegramMessages,
        resourcesRelations,
        userRelations,
        teamRelations,
        subjectRelations
      }
    })
  };
}
