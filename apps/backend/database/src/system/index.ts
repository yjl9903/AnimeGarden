import { SystemError } from '../error';
import { connectRedis } from '../connect/redis';
import { connectDatabase } from '../connect/database';

import { TagsModule } from '../tags';
import { SubjectsModule } from '../subjects';
import { ResourcesModule } from '../resources';
import { UsersModule, TeamsModule } from '../users';

import { setSecret } from './secret';
import { type SystemOptions, System as ISystem } from './system';

export * from './module';

export { type SystemOptions } from './system';

export type System = ISystem<{
  resources: ResourcesModule;
  tags: TagsModule;
  subjects: SubjectsModule;
  users: UsersModule;
  teams: TeamsModule;
}>;

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
    const { connection, database } = connectDatabase(options.postgresUri);
    system.database = database;
    system.disposables.push(() => connection.end());
    system.logger.success('Connect to Postgres');
  } catch (error) {
    system.logger.error(options);
    system.logger.error(error);
    throw error;
  }

  if (options.redisUri) {
    try {
      const storage = connectRedis(options.postgresUri);
      system.storage = storage;
      system.logger.success('Connect to Redis');
    } catch (error) {
      throw error;
    }
  }

  // Register modules
  system.modules.tags = new TagsModule(system);
  system.modules.subjects = new SubjectsModule(system);
  system.modules.resources = new ResourcesModule(system);
  system.modules.users = new UsersModule(system);
  system.modules.teams = new TeamsModule(system);

  return system;
}
