import { SystemError } from '../error';
import { connectRedis } from '../connect/redis';
import { connectDatabase } from '../connect/database';

import { TagsModule } from '../tags';
import { SubjectsModule } from '../subjects';
import { ResoucresModule } from '../resources';

import { setSecret } from './secret';
import { System as ISystem } from './system';

export * from './module';

export type System = ISystem<{
  resources: ResoucresModule;
  tags: TagsModule;
  subjects: SubjectsModule;
}>;

export interface SystemOptions {
  secret?: string;

  postgresUri?: string;

  redisUri?: string;
}

export async function makeSystem(options: SystemOptions) {
  const system: System = new ISystem();
  system.logger.wrapConsole();

  const secret = setSecret(options.secret);
  if (!options.secret) {
    system.logger.info(`Secret: ${secret}`);
  }

  if (!options.postgresUri) {
    throw new SystemError('No postgres connection uri');
  }

  try {
    const { connection, database } = connectDatabase(options.postgresUri);
    system.database = database;
    system.disposables.push(() => connection.end());
    system.logger.success('connect to Postgres');
  } catch (error) {
    throw error;
  }

  if (options.redisUri) {
    try {
      const storage = connectRedis(options.postgresUri);
      system.storage = storage;
      system.logger.success('connect to Redis');
    } catch (error) {
      throw error;
    }
  }

  // Register modules
  system.modules.tags = new TagsModule(system);
  system.modules.subjects = new SubjectsModule(system);
  system.modules.resources = new ResoucresModule(system);

  return system;
}
