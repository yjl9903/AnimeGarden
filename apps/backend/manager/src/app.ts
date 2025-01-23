import fs from 'fs-extra';
import path from 'path';
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

  try {
    return await makeSystem(options);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

// --- Server ---

app
  .command('start', 'Start Anime Garden server')
  .option('--host <ip>', 'Listen host')
  .option('--port <port>', 'Listen port')
  .action(async (options) => {
    const sys = await initialize(options);
    await sys.initialize();
    const server = await makeServer(sys, {});

    const host = options.host ?? process.env.HOST;
    const port = options.port ?? process.env.PORT;
    await server.listen({ host, port });
  });

app.command('cron', 'Start Anime Garden cron jobs executor').action(async (options) => {
  const sys = await initialize(options);
  await sys.initialize();
  await sys.import();
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
  .option('--start <number>', 'Fetch resources start from page')
  .option('--end <number>', 'Fetch resources end before page')
  .option('--page-size <number>', 'Fetch resources batch page size')
  .action(async (name, options) => {
    const sys = await initialize(options);
    await sys.initialize();
    const { transferFromV1 } = await import('@animegarden/database');
    // Transfer from old database
    await transferFromV1(sys, name ?? 'animegarden', {
      startPage: options.start ? +options.start : undefined,
      endPage: options.end ? +options.end : undefined,
      pageSize: options.pageSize ? +options.pageSize : undefined
    });
    // Import new data
    await sys.modules.subjects.importFromBgmd();
    await sys.modules.subjects.updateCalendar();
    await sys.modules.tags.importFromAnipar();
    await sys.close();
  });

app
  .command('fetch dmhy', 'Fetch resources from dmhy')
  .option('--start <number>', 'Fetch resources start from page', { cast: (v) => (v ? +v : 1) })
  .option('--end <number>', 'Fetch resources end before page')
  .option('--retry <count>', 'Request retry times', { cast: (v) => (v ? +v : 5) })
  .option('--out-dir <dir>', 'Fetched output dir')
  .action(async (options) => {
    const outDir = path.join(options.outDir ?? './output/', 'dmhy');
    await fs.ensureDir(outDir);

    const { fetchDmhyPage } = await import('@animegarden/scraper');
    const start = options.start;
    const end = options.end ? +options.end : start + 1;
    for (let i = start; i < end; i++) {
      const resp = await fetchDmhyPage(fetch, { page: i, retry: options.retry });
      if (resp.length === 0) break;
      fs.writeFileSync(path.join(outDir, i + '.json'), JSON.stringify(resp, null, 2), 'utf-8');
    }
  });

app
  .command('fetch moe', 'Fetch resources from moe')
  .option('--start <number>', 'Fetch resources start from page', { cast: (v) => (v ? +v : 1) })
  .option('--end <number>', 'Fetch resources end before page')
  .option('--retry <count>', 'Request retry times', { cast: (v) => (v ? +v : 5) })
  .option('--out-dir <dir>', 'Fetched output dir')
  .action(async (options) => {
    const outDir = path.join(options.outDir ?? './output/', 'moe');
    await fs.ensureDir(outDir);

    const { fetchMoePage } = await import('@animegarden/scraper');
    const start = options.start;
    const end = options.end ? +options.end : start + 1;
    for (let i = start; i < end; i++) {
      const resp = await fetchMoePage(fetch, { page: i, retry: options.retry });
      if (resp.length === 0) break;
      fs.writeFileSync(path.join(outDir, i + '.json'), JSON.stringify(resp, null, 2), 'utf-8');
    }
  });

app
  .command('fetch ani', 'Fetch resources from ANi')
  .option('--retry <count>', 'Request retry times', { cast: (v) => (v ? +v : 5) })
  .option('--out-dir <dir>', 'Fetched output dir')
  .action(async (options) => {
    const outDir = path.join(options.outDir ?? './output/', 'ani');
    await fs.ensureDir(outDir);

    const { fetchLastestANi } = await import('@animegarden/scraper');
    const resp = await fetchLastestANi(fetch);
    fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify(resp, null, 2), 'utf-8');
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

// --- utils
app
  .command('detail dmhy <url>', 'Fetch resource detail from dmhy')
  .option('--retry <count>', 'Request retry times', { cast: (v) => (v ? +v : 5) })
  .action(async (url, options) => {
    const { fetchDmhyDetail } = await import('@animegarden/scraper');
    const resp = await fetchDmhyDetail(fetch, url, { retry: options.retry });
    console.log(resp);
    return resp;
  });

app
  .command('detail moe <id>', 'Fetch resource detail from moe')
  .option('--retry <count>', 'Request retry times', { cast: (v) => (v ? +v : 5) })
  .action(async (id, options) => {
    const { fetchMoeDetail } = await import('@animegarden/scraper');
    const resp = await fetchMoeDetail(fetch, id, { retry: options.retry });
    console.log(resp);
    return resp;
  });

app
  .command('detail ani <id>', 'Fetch resource detail from ANi')
  .option('--retry <count>', 'Request retry times', { cast: (v) => (v ? +v : 5) })
  .action(async (id, options) => {
    const { fetchANiDetail } = await import('@animegarden/scraper');
    const resp = await fetchANiDetail(fetch, id, { retry: options.retry });
    console.log(resp);
    return resp;
  });
