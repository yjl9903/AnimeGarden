import { connectRedis } from '../connect/redis';
import {
  connectDatabase,
  getDatabaseConnectOptions,
  getResourcesSlowDatabaseConnectOptions
} from '../connect/database';

import { TagsModule } from '../tags';
import { PushModule } from '../push';
import { SubjectsModule } from '../subjects';
import { ResourcesModule } from '../resources';
import { ProvidersModule } from '../providers';
import { CollectionsModule } from '../collections';
import { UsersModule, TeamsModule } from '../users';

import { setSecret } from './secret';
import { SystemError } from '../error';
import { type SystemOptions, System as ISystem } from './system';

export * from './types';

export * from './module';
export * from '../error';

export { type SystemOptions } from './system';

export type System = ISystem<
  {
    providers: ProvidersModule;
    resources: ResourcesModule;
    tags: TagsModule;
    subjects: SubjectsModule;
    users: UsersModule;
    teams: TeamsModule;
    collections: CollectionsModule;
    push: PushModule;
  },
  import('./types').ResourcesRpcEventMap
>;

export async function makeSystem(options: SystemOptions) {
  const system: System = new ISystem(options);
  system.logger.wrapConsole();

  const secret = setSecret(options.secret);
  if (!options.secret) {
    system.logger.info(`Secret: ${secret}`);
  }

  if (!options.postgresUri) {
    throw new SystemError('No postgres connection URI');
  }

  try {
    const profile = options.profile ?? (options.cron ? 'cron' : 'cli');
    const { connection, database } = connectDatabase(
      options.postgresUri,
      getDatabaseConnectOptions(profile)
    );

    system.database = database;
    system.disposables.push(() => connection.end());
    system.logger.success(`Connect to Postgres (${profile})`);

    if (profile === 'server') {
      const { connection: slowConnection, database: slowDatabase } = connectDatabase(
        options.postgresUri,
        getResourcesSlowDatabaseConnectOptions()
      );

      system.slowDatabase = slowDatabase;
      system.slowQueryConnection = slowConnection;
      system.disposables.push(() => slowConnection.end());
      system.logger.success('Connect to Postgres (resources-slow)');
    }
  } catch (error) {
    throw error;
  }

  if (options.redisUri) {
    try {
      system.redis = connectRedis(options.redisUri);
      system.publisherRedis = connectRedis(options.redisUri);
      system.disposables.push(() => system.redis?.disconnect());
      system.disposables.push(() => system.publisherRedis?.disconnect());
      system.logger.success('Connect to Redis');
    } catch (error) {
      throw error;
    }
  }

  // Register modules
  system.modules.providers = new ProvidersModule(system, ProvidersModule.name);
  system.modules.users = new UsersModule(system, UsersModule.name);
  system.modules.teams = new TeamsModule(system, TeamsModule.name);
  system.modules.resources = new ResourcesModule(system, ResourcesModule.name);
  system.modules.collections = new CollectionsModule(system, CollectionsModule.name);
  system.modules.tags = new TagsModule(system, TagsModule.name);
  system.modules.subjects = new SubjectsModule(system, SubjectsModule.name);
  system.modules.push = new PushModule(system, PushModule.name);

  return system;
}
