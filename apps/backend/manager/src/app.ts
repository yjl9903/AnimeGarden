import 'dotenv/config';

import { breadc } from 'breadc';

import { makeServer, makeExecutor } from '@animegarden/server';
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
  .command('start', 'Start Anime Garden server')
  .option('--host <ip>', 'Listen host')
  .option('--port <port>', 'Listen port')
  .action(async (options) => {
    const sys = await initialize(options);
    await sys.initialize();
    await sys.import();
    const server = await makeServer(sys, {});

    const host = options.host ?? process.env.HOST;
    const port = options.port ?? process.env.PORT;
    await server.listen({ host, port });
  });

app.command('cron', 'Start Anime Garden cron jobs executor').action(async (options) => {
  const sys = await initialize(options);
  await sys.initialize();
  const executor = await makeExecutor(sys, {});
  await executor.start();
});

// --- Admin ---

app.command('migrate', 'Migrate Postgres database schema').action(async (options) => {
  const sys = await initialize(options);
  await migrate(sys);
  await sys.close();
});

app
  .command('transfer [database]', 'Transfer data from Anime Garden API V1')
  .option('--start <number>', 'Fetch resources start at page')
  .option('--end <number>', 'Fetch resources end before page')
  .option('--page-size <number>', 'Fetch resources batch page size')
  .action(async (name, options) => {
    const sys = await initialize(options);
    await sys.initialize();
    const { transferFromV1 } = await import('@animegarden/database');
    await transferFromV1(sys, name ?? 'animegarden', {
      startPage: options.start ? +options.start : undefined,
      endPage: options.end ? +options.end : undefined,
      pageSize: options.pageSize ? +options.pageSize : undefined
    });
    await sys.close();
  });

app
  .command('fetch', 'Fetch data from providers (WIP)')
  .option('--out-dir <dir>')
  .action(async (options) => {
    const sys = await initialize(options);
    await sys.initialize();
    // TODO
    await sys.close();
  });

app
  .command('import [dir]', 'Import subjects, tags, and local resources data (WIP)')
  .action(async (dir, options) => {
    const sys = await initialize(options);
    await sys.initialize();
    await sys.modules.subjects.importFromBgmd();
    await sys.modules.subjects.updateCalendar();
    await sys.modules.tags.importFromAnipar();
    await sys.close();
  });

app.command('import tags', 'Import tags from anipar (WIP)').action(async (options) => {
  const sys = await initialize(options);
  await sys.initialize();
  await sys.modules.tags.importFromAnipar();
  await sys.close();
});

app.command('import subjects', 'Import subjects from bgmd').action(async (options) => {
  const sys = await initialize(options);
  await sys.initialize();
  await sys.modules.subjects.importFromBgmd();
  await sys.modules.subjects.updateCalendar();
  await sys.close();
});

app
  .command('import resources [dir]', 'Import local resources data (WIP)')
  .action(async (dir, options) => {
    const sys = await initialize(options);
    await sys.initialize();
    // TODO
    await sys.close();
  });
