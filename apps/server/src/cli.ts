import 'dotenv/config';

import fs from 'fs-extra';
import path from 'path';
import { breadc } from 'breadc';
import { setGlobalDispatcher, EnvHttpProxyAgent } from 'undici';

import { SupportProviders, fetchAPI } from '@animegarden/client';

import { version } from '../package.json';

import { makeServer, makeExecutor } from './server';
import { type SystemOptions, makeSystem } from './system';

export const app = breadc('animegarden-server', { version })
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
  if (!options.site) {
    options.site = process.env.APP_HOST;
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
  .option('--site <site>', 'Web site host')
  .option('--host <ip>', 'Listen host')
  .option('--port <port>', 'Listen port')
  .option('--import', 'Import bangumi data', { default: false })
  .action(async (options) => {
    const sys = await initialize({ ...options, cron: false });
    sys.initialize(); // async initializing system

    const server = await makeServer(sys, {});

    const host = options.host ?? process.env.HOST;
    const port = options.port ?? process.env.PORT;
    await server.listen({ host, port });
  });

app
  .command('cron', 'Start Anime Garden cron jobs executor')
  .option('--site <site>', 'Web site host')
  .option('--import', 'Import bangumi data', { default: true })
  .action(async (options) => {
    const sys = await initialize({ ...options, cron: true });
    await sys.initialize();
    if (options.import) {
      await sys.import();
    }
    const executor = await makeExecutor(sys, {});
    await executor.start();
  });

// --- Admin ---
for (const provider of SupportProviders) {
  app
    .command(`admin fetch ${provider}`, `Invoke server fetching ${provider} resources`)
    .option('--url <url>', 'API Base URL')
    .action(async (options) => {
      const resp = await fetchAPI(
        `/admin/resources/${provider}`,
        { method: 'POST', headers: { authorization: `Bearer ${options.secret}` } },
        { baseURL: options.url }
      );
      console.log(resp);
    });
}

for (const provider of SupportProviders) {
  app
    .command(`admin sync ${provider}`, `Invoke server syncing ${provider} resources`)
    .option('--url <url>', 'API Base URL')
    .option('--start <page>', 'Start page')
    .option('--end <page>', 'End page')
    .action(async (options) => {
      const resp = await fetchAPI(
        `/admin/resources/${provider}/sync?start=${options.start}&end=${options.end}`,
        { method: 'POST', headers: { authorization: `Bearer ${options.secret}` } },
        { baseURL: options.url }
      );
      // @ts-ignore
      console.log(resp.resources);
    });
}

// --- Migration ---

app.command('migrate', 'Migrate Postgres database schema').action(async (options) => {
  const { migrateDrizzle } = await import('./connect/migrate');
  const sys = await initialize(options);
  await migrateDrizzle(sys);
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

async function main() {
  setGlobalDispatcher(new EnvHttpProxyAgent());
  await app.run(process.argv.slice(2)).catch((err) => console.error(err));
}

main();
