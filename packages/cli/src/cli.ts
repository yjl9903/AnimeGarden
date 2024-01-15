import { breadc } from 'breadc';

import { version } from '../package.json';

const cli = breadc('animegarden', { version });

cli
  .command('fetch <dmhy|moe>', 'Fetch resources list')
  .option('-o, --out-dir <dir>', { description: 'Output dir', default: 'output' })
  .option('--from <page>', { description: 'Fetch from page', default: '1' })
  .option('--to <page>', { description: 'Fetch to page, leave empty for all the data' })
  .action(async (platform, options) => {
    if (platform === 'dmhy') {
      const { fetchDmhy } = await import('./commands/dmhy');
      await fetchDmhy(+options.from, options.to ? +options.to : undefined, options.outDir);
    } else if (platform === 'moe') {
      throw new Error('unimplemented');
    }
  });

cli
  .command('database migrate', 'Migrate database')
  .alias('db migrate')
  .option('--uri <string>', 'Postgres database connection URI')
  .option('--host <string>', 'Postgres database host')
  .option('--port <string>', 'Postgres database port')
  .option('--username <string>', 'Postgres database username')
  .option('--password <string>', 'Postgres database password')
  .option('--database <string>', 'Postgres database name')
  .action(async (options) => {
    const { connection, database } = await connect(options);
    const { migrateDatabase } = await import('@animegarden/database');

    await migrateDatabase(database);
    await connection.end();
  });

cli
  .command('database insert <dmhy|moe> <data_dir>', 'Insert data to database')
  .alias('db insert')
  .option('--uri <string>', 'Postgres database connection URI')
  .option('--host <string>', 'Postgres database host')
  .option('--port <string>', 'Postgres database port')
  .option('--username <string>', 'Postgres database username')
  .option('--password <string>', 'Postgres database password')
  .option('--database <string>', 'Postgres database name')
  .option('--meili-url <url>', 'MeiliSearch URL')
  .option('--meili-key <key>', 'MeiliSearch Key')
  .action(async (platform, dir, options) => {
    const { connection, database } = await connect(options);
    const meili = await connectMeili({ url: options.meiliUrl, key: options.meiliKey });

    if (platform === 'dmhy') {
      const { insertDmhy } = await import('./commands/dmhy');
      await insertDmhy(database, meili, dir);
    } else if (platform === 'moe') {
      throw new Error('unimplemented');
    }

    await connection.end();
  });

async function connect(options: {
  uri?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
}) {
  await import('dotenv/config');

  const uri = options.uri ?? process.env.POSTGRES_URI ?? process.env.POSTGRES_CONNECTION_STRING;
  const host = options.host ?? process.env.POSTGRES_HOST;
  const port = options.port ?? process.env.POSTGRES_PORT;
  const username = options.username ?? process.env.POSTGRES_USERNAME;
  const password = options.password ?? process.env.POSTGRES_PASSWORD;
  const databaseName = options.database ?? process.env.POSTGRES_DATABASE ?? 'animegarden';

  if (!uri && !host) {
    throw new Error('Please specify database connection config');
  }

  const { connectDatabase } = await import('@animegarden/database');

  return uri
    ? connectDatabase(uri, { max: 1 })
    : connectDatabase({
        host,
        port: port ? +port : undefined,
        username,
        password,
        database: databaseName,
        max: 1
      });
}

cli
  .command('meili migrate')
  .option('--meili-url <url>', 'MeiliSearch URL')
  .option('--meili-key <key>', 'MeiliSearch Key')
  .action(async (options) => {
    const meili = await connectMeili({ url: options.meiliUrl, key: options.meiliKey });
    const index = 'resources';

    // Create index
    try {
      await meili.index(index).getRawInfo();
    } catch {
      await meili.createIndex(index);
    }

    // Only title_alt can be searched
    {
      const searchable = await meili.index(index).getSearchableAttributes();
      if (searchable.length === 1 && searchable[0] === '*') {
        await meili.index(index).updateSearchableAttributes(['title_alt']);
      }
    }
  });

async function connectMeili(options: { url?: string; key?: string }) {
  await import('dotenv/config');

  const host = options.url ?? process.env.MEILI_URL;
  const key = options.key ?? process.env.MEILI_KEY;

  if (!host || !key) {
    throw new Error('Please specify meilisearch connection config');
  }

  const { connectMeiliSearch } = await import('@animegarden/database');
  return connectMeiliSearch(host, key);
}

cli.run(process.argv.slice(2)).catch((err) => console.error(err));
