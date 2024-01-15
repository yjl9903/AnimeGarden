import { format } from 'node:util';

import { Hono } from 'hono';

import { logger as honoLogger } from 'hono/logger';

import { logger } from './logger';

export const app = new Hono({});

export async function registerApp(fn: (hono: typeof app) => Promise<void>) {
  await fn(app);
}

app.all(
  '*',
  honoLogger((message: string, ...rest: string[]) => {
    const content = format(message, ...rest);
    logger.info('request', content);
  })
);

app.get('/', (c) => c.text('Hello AnimeGarden!'));
