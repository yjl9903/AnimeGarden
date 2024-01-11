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
    await import('dotenv/config');

    const uri = options.uri ?? process.env.POSTGRES_URI ?? process.env.POSTGRES_CONNECTION_STRING;
    const host = options.host ?? process.env.POSTGRES_HOST;
    const port = options.port ?? process.env.POSTGRES_PORT;
    const username = options.username ?? process.env.POSTGRES_USERNAME;
    const password = options.password ?? process.env.POSTGRES_PASSWORD;
    const databaseName = options.database ?? process.env.POSTGRES_DATABASE ?? 'animegarden';

    if (!uri && !host) {
      return;
    }

    const { connectDatabase, migrateDatabase } = await import('@animegarden/database');

    const { connection, database } = uri
      ? connectDatabase(uri, { max: 1 })
      : connectDatabase({
          host,
          port: port ? +port : undefined,
          username,
          password,
          database: databaseName,
          max: 1
        });

    await migrateDatabase(database);
    await connection.end();
  });

cli.run(process.argv.slice(2)).catch((err) => console.error(err));
