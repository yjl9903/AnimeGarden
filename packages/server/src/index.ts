import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Cron } from 'croner';

import { app } from './app';
import { logger } from './logger';
import { storage } from './storage';
import { database } from './database';
import { meiliSearch } from './meilisearch';

import { registerAdmin } from './admin';
import { registerQuery } from './query';

registerAdmin();
registerQuery();

const port = process.env.port ? +process.env.port : process.env.PORT ? +process.env.PORT : 3000;

serve(
  {
    fetch: app.fetch,
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
  try {
    const req = new Request(`https://api.zeabur.internal/admin/dmhy/resources`, {
      method: 'POST'
    });
    logger.info(`cron`, `Fetch dmhy resources`);
    const resp = await app.fetch(req);
    logger.info(`cron`, JSON.stringify(await resp.json()));
  } catch (error) {
    console.error(error);
  }
});

Cron(`*/5 * * * *`, { timezone: 'Asia/Shanghai', protect: true }, async () => {
  try {
    const req = new Request(`https://api.zeabur.internal/admin/moe/resources`, {
      method: 'POST'
    });
    // logger.info(`cron`, `Fetch moe resources`);
    // const resp = await app.fetch(req);
    // logger.info(`cron`, JSON.stringify(await resp.json()));
  } catch (error) {
    console.error(error);
  }
});

Cron(`0 * * * *`, { timezone: 'Asia/Shanghai', protect: true }, async () => {
  try {
    const req = new Request(`https://api.zeabur.internal/admin/dmhy/resources/sync`, {
      method: 'POST'
    });
    logger.info(`cron`, `Sync dmhy resources`);
    const resp = await app.fetch(req);
    logger.info(`cron`, JSON.stringify(await resp.json()));
  } catch (error) {
    console.error(error);
  }
});
