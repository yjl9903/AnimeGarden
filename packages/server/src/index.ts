import 'dotenv/config';

import { Cron } from 'croner';
import { serve } from '@hono/node-server';

import { updateRefreshTimestamp } from '@animegarden/database';

import { app } from './app';
import { logger } from './logger';
import { storage } from './storage';
import { database } from './database';
import { meiliSearch } from './meilisearch';

import { registerAdmin } from './admin';
import { registerQuery } from './query';

const admin = registerAdmin();
const query = registerQuery();

const hostname = process.env.HOST ?? process.env.host ?? '0.0.0.0';
const port = process.env.PORT ? +process.env.PORT : process.env.port ? +process.env.port : 3000;

serve(
  {
    fetch: app.fetch,
    hostname,
    port
  },
  async (info) => {
    logger.info(null, `Listening http://${info.address}:${info.port}`);

    await database.query.resources.findFirst();
    logger.info(null, `Connect to postgres`);

    await storage.getItem(`state/refresh-timestamp`);
    logger.info(null, `Connect to redis`);

    await meiliSearch.index('resources').getStats();
    logger.info(null, `Connect to meilisearch`);
  }
);

Cron(`*/5 * * * *`, { timezone: 'Asia/Shanghai', protect: true }, async () => {
  const result = await Promise.all([
    (async () => {
      try {
        logger.info(`cron`, `Fetch dmhy resources`);
        const req = new Request(`https://api.zeabur.internal/admin/resources/dmhy`, {
          method: 'POST'
        });
        const resp = await app.fetch(req);
        return (await resp.json()) as { count: number };
      } catch (error) {
        console.error(error);
      }
    })(),
    (async () => {
      try {
        logger.info(`cron`, `Fetch moe resources`);
        const req = new Request(`https://api.zeabur.internal/admin/resources/moe`, {
          method: 'POST'
        });
        const resp = await app.fetch(req);
        return (await resp.json()) as { count: number };
      } catch (error) {
        console.error(error);
      }
    })(),
    (async () => {
      try {
        logger.info(`cron`, `Fetch ani resources`);
        const req = new Request(`https://api.zeabur.internal/admin/resources/ani`, {
          method: 'POST'
        });
        const resp = await app.fetch(req);
        return (await resp.json()) as { count: number };
      } catch (error) {
        console.error(error);
      }
    })()
  ]);

  if ((result[0]?.count ?? 0 + (result[1]?.count ?? 0)) > 0) {
    await updateRefreshTimestamp(storage).catch(() => {});
  }
});

Cron(`0 * * * *`, { timezone: 'Asia/Shanghai', protect: true }, async () => {
  await Promise.all([
    (async () => {
      try {
        const req = new Request(`https://api.zeabur.internal/admin/resources/dmhy/sync`, {
          method: 'POST'
        });
        logger.info(`cron`, `Sync dmhy resources`);
        const resp = await app.fetch(req);
        logger.info(`cron`, JSON.stringify(await resp.json()));
      } catch (error) {
        console.error(error);
      }
    })(),
    (async () => {
      try {
        const req = new Request(`https://api.zeabur.internal/admin/resources/moe/sync`, {
          method: 'POST'
        });
        logger.info(`cron`, `Sync moe resources`);
        const resp = await app.fetch(req);
        logger.info(`cron`, JSON.stringify(await resp.json()));
      } catch (error) {
        console.error(error);
      }
    })(),
    (async () => {
      try {
        const req = new Request(`https://api.zeabur.internal/admin/resources/ani/sync`, {
          method: 'POST'
        });
        logger.info(`cron`, `Sync ani resources`);
        const resp = await app.fetch(req);
        logger.info(`cron`, JSON.stringify(await resp.json()));
      } catch (error) {
        console.error(error);
      }
    })()
  ]);
});
