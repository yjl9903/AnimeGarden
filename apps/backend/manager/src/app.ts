import 'dotenv/config';
import { breadc } from 'breadc';
import { type SystemOptions, makeSystem } from '@animegarden/database';

import { version } from '../package.json';

import { migrate } from './commands/migrate';

export const app = breadc('animegarden-manager', { version })
  .option('--postgres-uri <string>', 'Postgres connection URI')
  .option('--redis-uri <string>', 'Redis connection URI');

async function initialize(options: SystemOptions) {
  if (!options.postgresUri) {
    options.postgresUri = process.env.POSTGRES_URI ?? process.env.DATABASE_URI;
  }
  if (!options.redisUri) {
    options.redisUri = process.env.REDIS_URI;
  }
  return await makeSystem(options)
}

app.command('migrate', 'Migrate Postgres database schema')
  .action(async (options) => {
    const sys = await initialize(options);
    await migrate(sys);
    await sys.close();
  });

app.command('import', 'Import data from Anime Garden API')
  .action(async (options) => {
    const sys = await initialize(options);
    await sys.initialize();
    // TODO
    await sys.close();
  });
