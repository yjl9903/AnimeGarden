import { app } from './app';

import { serve } from '@hono/node-server';

import { logger } from './logger';

serve(
  {
    fetch: app.fetch,
    port: process.env.port ? +process.env.port : 3000
  },
  (info) => {
    logger.info(null, `Listening http://${info.address}:${info.port}`);
  }
);
