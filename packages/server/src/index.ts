import { format } from 'node:util';

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger as honoLogger } from 'hono/logger';

import { logger } from './logger';

const app = new Hono({});

app.all(
  '*',
  honoLogger((message: string, ...rest: string[]) => {
    const content = format(message, ...rest);
    logger.info('request', content);
  })
);

app.get('/', (c) => c.text('Hello AnimeGarden!'));

serve(
  {
    fetch: app.fetch,
    port: process.env.port ? +process.env.port : 3000
  },
  (info) => {
    logger.info(null, `Listening http://${info.address}:${info.port}`);
  }
);
