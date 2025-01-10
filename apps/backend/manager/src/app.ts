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
  return await makeSystem(options);
}

// --- Server ---

app
  .command('start', 'Start Anime Garden Server')
  .option('--cron', 'Enable cron jobs')
  .action(async (options) => {
    const sys = await initialize(options);
    await sys.initialize();
    // TODO: create server
  });

// --- Admin ---

app.command('migrate', 'Migrate Postgres database schema').action(async (options) => {
  const sys = await initialize(options);
  await migrate(sys);
  await sys.close();
});

app.command('transfer [database]', 'Transfer data from Anime Garden API V1').action(async (name, options) => {
  const sys = await initialize(options);
  await sys.initialize();
  const { transferFromV1 } = await import('@animegarden/database');
  await transferFromV1(sys, name ?? 'animegarden');
  await sys.close();
});

app
  .command('fetch', 'Fetch data from providers')
  .option('--out-dir <dir>')
  .action(async (options) => {
    const sys = await initialize(options);
    await sys.initialize();
    // TODO
    await sys.close();
  });

app
  .command('import [dir]', 'Import subjects, tags, and local resources data')
  .action(async (dir, options) => {
    const sys = await initialize(options);
    await sys.initialize();
    await sys.modules.subjects.importFromBgmd();
    await sys.modules.tags.importFromAnipar();
    await sys.close();
  });

app.command('import tags', 'Import tags from anipar').action(async (options) => {
  const sys = await initialize(options);
  await sys.initialize();
  await sys.modules.tags.importFromAnipar();
  await sys.close();
});

app.command('import subjects', 'Import subjects from bgmd').action(async (options) => {
  const sys = await initialize(options);
  await sys.initialize();
  await sys.modules.subjects.importFromBgmd();
  await sys.close();
});

app.command('import resources [dir]', 'Import local resources data').action(async (dir, options) => {
  const sys = await initialize(options);
  await sys.initialize();
  // TODO
  await sys.close();
});
