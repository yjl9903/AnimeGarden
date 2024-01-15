import { format } from 'node:util';

import { Hono } from 'hono';

import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { logger as honoLogger } from 'hono/logger';

import { logger } from './logger';

export const app = new Hono({});

export async function registerApp(fn: (hono: typeof app) => Promise<void>) {
  await fn(app);
}

app.use('*', cors());
app.use('*', prettyJSON());
app.use(
  '*',
  honoLogger((message: string, ...rest: string[]) => {
    const content = format(message, ...rest);
    logger.info('request', content);
  })
);

app.get('/', async (c) => {
  return c.json({
    message: 'AnimeGarden - 動漫花園 3-rd party mirror site',
    timestamp: new Date().toString()
  });
});
