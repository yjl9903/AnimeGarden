import { serve } from '@hono/node-server';

import { app } from './app';
import { logger } from './logger';
import { database } from './database';

serve(
  {
    fetch: app.fetch,
    port: process.env.port ? +process.env.port : 3000
  },
  async (info) => {
    logger.info(null, `Listening http://${info.address}:${info.port}`);

    await database.query.resources.findFirst();
    logger.info(null, `Connect to postgres`);
  }
);
