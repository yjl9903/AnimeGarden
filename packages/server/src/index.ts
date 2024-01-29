import 'dotenv/config';
import { serve } from '@hono/node-server';

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
