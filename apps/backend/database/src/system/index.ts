import { type ConsolaInstance, createConsola } from 'consola'

import { SystemError } from '../error';
import { connectDatabase, Database } from '../connect/database'
import { connectRedis, RedisStorage as Storage } from '../connect/redis'

export type { Database, Storage }

export class System {
  public readonly logger: ConsolaInstance
  
  public database!:  Database;

  public storage?: Storage;

  public disposables: Array<(sys: System) => (void | Promise<void>)> = []

  public constructor() {
    this.logger = createConsola().withTag('System');
  }
  
  public async initialize() {
    
  }

  public async close() {
    for (const fn of this.disposables) {
      try {
        await fn(this);
      } catch (error) {
        console.log(error);
      }
    }
  }
}

export interface SystemOptions {
  postgresUri?: string

  redisUri?: string
}

export async function makeSystem(options: SystemOptions) {
  const system = new System();
  system.logger.wrapConsole();

  if (!options.postgresUri) {
    throw new SystemError('No postgres connection uri');
  }

  try {
    const { connection, database } = connectDatabase(options.postgresUri);
    system.database = database;
    system.disposables.push(() => connection.end())
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

  return system;
}
