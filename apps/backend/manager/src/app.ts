import 'dotenv/config';
import { breadc } from 'breadc';
import { type SystemOptions, makeSystem } from '@animegarden/database';

import { version } from '../package.json';

import { migrate } from './commands/migrate';

export const app = breadc('animegarden-manager', { version })
  .option('--secret <string>', 'Admin auth secret')
  .option('--postgres-uri <string>', 'Postgres connection URI')
  .option('--redis-uri <string>', 'Redis connection URI');

async function initialize(options: SystemOptions) {
  if (!options.secret) {
    options.secret = process.env.ADMIN_SECRET ?? process.env.SECRET;
  }
  if (!options.postgresUri) {
    options.postgresUri = process.env.POSTGRES_URI ?? process.env.DATABASE_URI;
  }
  if (!options.redisUri) {
    options.redisUri = process.env.REDIS_URI;
  }
  return await makeSystem(options)
}

// --- Server ---

app.command('start', 'Start Anime Garden Server')
  .option('--cron', 'Enable cron jobs')
  .action(async (options) => {
    const sys = await initialize(options);
    await sys.initialize();
    // TODO: create server
  });

// --- Admin ---

app.command('migrate', 'Migrate Postgres database schema')
  .action(async (options) => {
    const sys = await initialize(options);
    await migrate(sys);
    await sys.close();
  });

app.command('transfer', 'Transfer data from Anime Garden API V1')
  .action(async (options) => {
    const sys = await initialize(options);
    await sys.initialize();
    // TODO
    await sys.close();
  });

app.command('fetch', 'Fetch data from providers')
  .option('--out-dir <dir>')
  .action(async (options) => {
    const sys = await initialize(options);
    await sys.initialize();
    // TODO
    await sys.close();
  })

app.command('import [dir]', 'Import local resources data')
  .action(async (data, options) => {
    const sys = await initialize(options);
    await sys.initialize();
    // TODO
    await sys.close();
  });