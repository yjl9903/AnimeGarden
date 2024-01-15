import { app } from './app';

import { serve } from '@hono/node-server';

import { logger } from './logger';
import { connection } from './database';

serve(
  {
    fetch: app.fetch,
    port: process.env.port ? +process.env.port : 3000
  },
  async (info) => {
    logger.info(null, `Listening http://${info.address}:${info.port}`);
  }
);
