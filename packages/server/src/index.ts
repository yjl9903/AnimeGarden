import { serve } from '@hono/node-server';

import { app } from './app';
import { logger } from './logger';
import { storage } from './storage';
import { database } from './database';

import { registerAdmin } from './admin';
import { registerQuery } from './query';

registerAdmin();
registerQuery();

serve(
  {
    fetch: app.fetch,
    port: process.env.port ? +process.env.port : 3000
  },
  async (info) => {
    logger.info(null, `Listening http://${info.address}:${info.port}`);

    await database.query.resources.findFirst();
    logger.info(null, `Connect to postgres`);

    await storage.getItem(`state/refresh-timestamp`);
    logger.info(null, `Connect to redis`);
  }
);
