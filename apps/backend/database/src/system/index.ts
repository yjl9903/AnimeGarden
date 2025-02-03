import { SystemError } from '../error';
import { connectRedis } from '../connect/redis';
import { connectDatabase } from '../connect/database';

import { TagsModule } from '../tags';
import { SubjectsModule } from '../subjects';
import { ResourcesModule } from '../resources';
import { ProvidersModule } from '../providers';
import { UsersModule, TeamsModule } from '../users';
import { CollectionsModule } from '../collections';

import { setSecret } from './secret';
import { type SystemOptions, System as ISystem } from './system';

export * from './types';

export * from './module';

export { type SystemOptions } from './system';

export type System = ISystem<{
  providers: ProvidersModule;
  resources: ResourcesModule;
  tags: TagsModule;
  subjects: SubjectsModule;
  users: UsersModule;
  teams: TeamsModule;
  collections: CollectionsModule;
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
    const { connection, database } = connectDatabase(options.postgresUri, {
      /* 连接池相关 */
      max: 10, // 最大连接数，默认10
      idle_timeout: 60, // 空闲超时(秒)，0 表示无限制
      max_lifetime: 60 * 30 // 连接最大存活时间(毫秒)，0 表示无限制

      /* TCP Keep-Alive */
      // keep_alive: true,    // 是否启用 TCP Keep-Alive，默认true
      // keep_alive_initial_delay_seconds: 60, // 第一次Keep-Alive间隔(秒)，默认60
    });

    system.database = database;
    system.disposables.push(() => connection.end());
    system.logger.success('Connect to Postgres');
  } catch (error) {
    throw error;
  }

  if (options.redisUri) {
    try {
      const redis = connectRedis(options.redisUri);
      system.redis = redis;
      system.logger.success('Connect to Redis');
    } catch (error) {
      throw error;
    }
  }

  // Register modules
  system.modules.providers = new ProvidersModule(system, ProvidersModule.name);
  system.modules.tags = new TagsModule(system, TagsModule.name);
  system.modules.subjects = new SubjectsModule(system, SubjectsModule.name);
  system.modules.users = new UsersModule(system, UsersModule.name);
  system.modules.teams = new TeamsModule(system, TeamsModule.name);
  system.modules.collections = new CollectionsModule(system, CollectionsModule.name);
  system.modules.resources = new ResourcesModule(system, ResourcesModule.name);

  return system;
}
